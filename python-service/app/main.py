import os
import json
import uuid
import cv2
import numpy as np
import base64
from fastapi import FastAPI, UploadFile, File, Form, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.services.segment_floor import detect_floor_mask
from app.services.polygon_extractor import extract_four_corners
from app.services.geometric_validator import calculate_confidence
from app.services.detect_objects import detect_objects as analyze_room_objects
from app.services.texture_mapper import apply_texture_to_floor
from app.services.shadow_preserver import extract_shadow_map, calculate_shadow_metrics
from app.services.lighting_analyzer import analyze_lighting
from app.services.reflection_mapper import build_reflection_map, apply_perspective_stretch, blend_reflections, calculate_reflection_metrics
from app.services.material_renderer import apply_metallic_response

app = FastAPI(title="Epoxy AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_convex_quadrilateral(pts):
    if len(pts) != 4:
        return False
    
    def cross_product(p1, p2, p3):
        return (p2[0] - p1[0]) * (p3[1] - p2[1]) - (p2[1] - p1[1]) * (p3[0] - p2[0])

    cross_products = []
    for i in range(4):
        p1 = pts[i]
        p2 = pts[(i + 1) % 4]
        p3 = pts[(i + 2) % 4]
        cross_products.append(cross_product(p1, p2, p3))
        
    all_positive = all(cp > 0 for cp in cross_products)
    all_negative = all(cp < 0 for cp in cross_products)
    
    return all_positive or all_negative

def prepare_masks(custom_mask_base64, active_object_masks_base64):
    """Parses base64 custom mask and object masks"""
    loaded_object_masks = []
    custom_mask = None
    
    if custom_mask_base64:
        # Decode base64 to numpy array
        # Ensure it's a 2D mask
        mask_bytes = base64.b64decode(custom_mask_base64.split(",")[-1] if "," in custom_mask_base64 else custom_mask_base64)
        mask_arr = np.frombuffer(mask_bytes, np.uint8)
        custom_mask = cv2.imdecode(mask_arr, cv2.IMREAD_GRAYSCALE)
            
    if active_object_masks_base64:
        # active_object_masks_base64 is a JSON string of base64 strings
        obj_b64_list = json.loads(active_object_masks_base64)
        for obj_b64 in obj_b64_list:
            obj_bytes = base64.b64decode(obj_b64.split(",")[-1] if "," in obj_b64 else obj_b64)
            obj_arr = np.frombuffer(obj_bytes, np.uint8)
            obj_m = cv2.imdecode(obj_arr, cv2.IMREAD_GRAYSCALE)
            
            if obj_m is not None:
                if custom_mask is not None:
                    custom_mask[obj_m > 0] = 0
                loaded_object_masks.append(obj_m)
    return custom_mask, loaded_object_masks

@app.post("/validate-floor")
async def validate_floor(corners: str = Form(...)):
    try:
        corner_pts = json.loads(corners)
        pts = [[c['x'], c['y']] for c in corner_pts]
        if not is_convex_quadrilateral(pts):
            return JSONResponse({"valid": False, "reason": "self-intersecting or concave polygon"})
        return JSONResponse({"valid": True})
    except Exception as e:
        return JSONResponse({"valid": False, "reason": str(e)})

@app.post("/analyze-room")
async def analyze_room(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR) # BGR
        
        if img is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image file"})
            
        mask, _ = detect_floor_mask(img)
        corners = extract_four_corners(mask)
        
        if not corners:
            return JSONResponse(status_code=400, content={"error": "Could not extract 4 corners"})
            
        h, w = img.shape[:2]
        conf_data = calculate_confidence(mask, corners, w, h)
        
        # Convert floor mask to base64
        success, encoded_mask = cv2.imencode('.png', mask)
        floor_mask_b64 = "data:image/png;base64," + base64.b64encode(encoded_mask).decode('utf-8')
        
        # Detect objects to exclude
        objects = analyze_room_objects(img)
        
        visible_mask = mask.copy()
        excluded_objects = []
        
        for i, obj in enumerate(objects):
            obj_mask = obj["mask"]
            
            # Convert object mask to RGBA for frontend visualization
            rgba = cv2.cvtColor(obj_mask, cv2.COLOR_GRAY2BGRA)
            rgba[:, :, 3] = obj_mask # Alpha channel
            rgba[:, :, 0:3] = 255 # Make pixels white
            success, encoded_obj = cv2.imencode('.png', rgba)
            obj_mask_b64 = "data:image/png;base64," + base64.b64encode(encoded_obj).decode('utf-8')
            
            # Subtract from visible floor
            visible_mask[obj_mask > 0] = 0
            
            # Generate pure grayscale mask base64 to send back to server later
            success, pure_encoded_obj = cv2.imencode('.png', obj_mask)
            pure_obj_b64 = "data:image/png;base64," + base64.b64encode(pure_encoded_obj).decode('utf-8')
            
            excluded_objects.append({
                "class": obj["class"],
                "score": float(obj["score"]),
                "maskUrl": obj_mask_b64,
                "maskFile": pure_obj_b64 # Store base64 payload as maskFile
            })
            
        visible_coverage = float(np.sum(visible_mask > 0) / (h * w))
        
        # Analyze lighting (heavy calculation)
        lighting = analyze_lighting(img)
        
        metadata = {
            "corners": corners,
            "confidence": conf_data,
            "floorMaskUrl": floor_mask_b64,
            "floorMaskFile": floor_mask_b64,
            "excludedObjects": excluded_objects,
            "visibleFloorCoverage": visible_coverage,
            "lighting": lighting
        }
        
        return JSONResponse(metadata)
        
    except Exception as e:
        import traceback
        print(f"Error in analyze_room: {e}")
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/apply-floor")
async def apply_floor(
    image: UploadFile = File(...),
    texture: UploadFile = File(...),
    corners: str = Form(...),
    opacity: int = Form(100),
    finish: str = Form("Glossy"),
    floor_mask_file: str = Form(None),
    active_object_masks: str = Form(None), # JSON list of base64 strings
    user_mask: UploadFile = None,
    preserve_shadows: str = Form("true"),
    realism_mode: str = Form("Premium"),
    material_depth: str = Form("Standard"),
    metallic_intensity: int = Form(50)
):
    try:
        room_bytes = await image.read()
        room_nparr = np.frombuffer(room_bytes, np.uint8)
        room_img = cv2.imdecode(room_nparr, cv2.IMREAD_COLOR)
        if room_img is None:
            return JSONResponse(status_code=400, content={"error": "Must provide valid image"})
            
        texture_bytes = await texture.read()
        tex_nparr = np.frombuffer(texture_bytes, np.uint8)
        tex_img = cv2.imdecode(tex_nparr, cv2.IMREAD_COLOR)
        
        corner_pts = json.loads(corners)
        
        custom_mask, loaded_object_masks = prepare_masks(floor_mask_file, active_object_masks)
        
        if user_mask and custom_mask is not None:
            mask_bytes = await user_mask.read()
            if mask_bytes and len(mask_bytes) > 0:
                mask_nparr = np.frombuffer(mask_bytes, np.uint8)
                user_m = cv2.imdecode(mask_nparr, cv2.IMREAD_UNCHANGED)
                if user_m is not None and len(user_m.shape) == 3 and user_m.shape[2] == 4:
                    alpha = user_m[:, :, 3]
                    restore_mask = (alpha > 0) & (user_m[:, :, 0] > 127)
                    erase_mask = (alpha > 0) & (user_m[:, :, 0] < 127)
                    custom_mask[restore_mask] = 255
                    custom_mask[erase_mask] = 0
        
        if custom_mask is None:
            custom_mask, _ = detect_floor_mask(room_img)
                
        final_img, warped_tex = apply_texture_to_floor(room_img, tex_img, corner_pts, opacity, custom_mask)
        
        shadow_score, shadow_coverage = 0.0, 0.0
        shadow_map = None
        if preserve_shadows.lower() == "true":
            shadow_map = extract_shadow_map(room_img, custom_mask, loaded_object_masks)
            shadow_coverage, shadow_score = calculate_shadow_metrics(shadow_map, custom_mask)
            
        lighting = analyze_lighting(room_img)
        sources = lighting["sources"]
        
        final_img, _ = apply_metallic_response(
            final_img, warped_tex, custom_mask, lighting, shadow_map,
            realism_mode=realism_mode, material_depth=material_depth, metallic_intensity=metallic_intensity
        )
        
        reflection_map = build_reflection_map(room_img.shape, sources, custom_mask, finish)
        reflection_map = apply_perspective_stretch(reflection_map)
        final_img = blend_reflections(final_img, reflection_map)
        
        score, coverage = calculate_reflection_metrics(reflection_map, custom_mask)
        
        success, encoded_image = cv2.imencode('.jpg', final_img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not success:
            return JSONResponse(status_code=500, content={"error": "Failed to encode image"})
            
        headers = {
            "X-Reflection-Score": str(score),
            "X-Reflection-Coverage": str(coverage),
            "X-Shadow-Score": str(shadow_score),
            "X-Shadow-Coverage": str(shadow_coverage),
            "Access-Control-Expose-Headers": "X-Reflection-Score, X-Reflection-Coverage, X-Shadow-Score, X-Shadow-Coverage"
        }
            
        return Response(content=encoded_image.tobytes(), media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        import traceback
        print(f"Error in apply_floor: {e}")
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/reflection-debug")
async def reflection_debug(
    image: UploadFile = File(...),
    finish: str = Form("Glossy"),
    floor_mask_file: str = Form(None),
    active_object_masks: str = Form(None)
):
    try:
        room_bytes = await image.read()
        room_nparr = np.frombuffer(room_bytes, np.uint8)
        room_img = cv2.imdecode(room_nparr, cv2.IMREAD_COLOR)
        
        custom_mask, loaded_object_masks = prepare_masks(floor_mask_file, active_object_masks)
        
        if custom_mask is None:
            custom_mask, _ = detect_floor_mask(room_img)
            
        lighting = analyze_lighting(room_img)
        sources = lighting["sources"]
        
        reflection_map = build_reflection_map(room_img.shape, sources, custom_mask, finish)
        reflection_map = apply_perspective_stretch(reflection_map)
        
        success, encoded_image = cv2.imencode('.png', reflection_map)
        return Response(content=encoded_image.tobytes(), media_type="image/png")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/shadow-debug")
async def shadow_debug(
    image: UploadFile = File(...),
    floor_mask_file: str = Form(None),
    active_object_masks: str = Form(None)
):
    try:
        room_bytes = await image.read()
        room_nparr = np.frombuffer(room_bytes, np.uint8)
        room_img = cv2.imdecode(room_nparr, cv2.IMREAD_COLOR)
        
        custom_mask, loaded_object_masks = prepare_masks(floor_mask_file, active_object_masks)
        
        if custom_mask is None:
            custom_mask, _ = detect_floor_mask(room_img)
            
        shadow_map = extract_shadow_map(room_img, custom_mask, loaded_object_masks)
        success, encoded_image = cv2.imencode('.png', shadow_map)
        return Response(content=encoded_image.tobytes(), media_type="image/png")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/material-debug")
async def material_debug(
    texture: UploadFile = File(...),
    image: UploadFile = File(...),
    corners: str = Form(...),
    floor_mask_file: str = Form(None),
    active_object_masks: str = Form(None),
    realism_mode: str = Form("Premium"),
    material_depth: str = Form("Standard"),
    metallic_intensity: int = Form(50)
):
    try:
        room_bytes = await image.read()
        room_nparr = np.frombuffer(room_bytes, np.uint8)
        room_img = cv2.imdecode(room_nparr, cv2.IMREAD_COLOR)
        
        texture_bytes = await texture.read()
        tex_nparr = np.frombuffer(texture_bytes, np.uint8)
        tex_img = cv2.imdecode(tex_nparr, cv2.IMREAD_COLOR)
        
        corner_pts = json.loads(corners)
        custom_mask, loaded_object_masks = prepare_masks(floor_mask_file, active_object_masks)
        
        if custom_mask is None:
            custom_mask, _ = detect_floor_mask(room_img)
            
        final_img, warped_tex = apply_texture_to_floor(room_img, tex_img, corner_pts, 100, custom_mask)
        shadow_map = extract_shadow_map(room_img, custom_mask, loaded_object_masks)
        lighting = analyze_lighting(room_img)
        
        _, response_preview = apply_metallic_response(
            final_img, warped_tex, custom_mask, lighting, shadow_map,
            realism_mode=realism_mode, material_depth=material_depth, metallic_intensity=metallic_intensity
        )
        
        success, encoded_image = cv2.imencode('.png', response_preview)
        return Response(content=encoded_image.tobytes(), media_type="image/png")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
