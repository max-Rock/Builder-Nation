import cv2
import numpy as np
import hashlib

# Simple in-memory cache to avoid recomputing CLAHE and metallic map
_material_cache = {}
MAX_CACHE_SIZE = 10

def _get_texture_hash(warped_tex):
    small = cv2.resize(warped_tex, (64, 64))
    return hashlib.md5(small.tobytes()).hexdigest()

def generate_height_map(warped_tex):
    """gray texture -> CLAHE -> height map"""
    gray = cv2.cvtColor(warped_tex, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    return clahe.apply(gray)

def generate_metallic_map(warped_tex):
    """texture saturation + texture luminance"""
    hsv = cv2.cvtColor(warped_tex, cv2.COLOR_BGR2HSV)
    saturation = hsv[:,:,1].astype(np.float32) / 255.0
    luminance = hsv[:,:,2].astype(np.float32) / 255.0
    
    base_map = (saturation * 0.5 + luminance * 0.5) * 255.0
    return np.clip(base_map, 0, 255).astype(np.uint8)

def enhance_swirl_details(height_map, sparkle_level):
    """edge detection -> dilate -> gaussian blur -> directional highlight"""
    if sparkle_level <= 0.0:
        return np.zeros_like(height_map, dtype=np.float32)
        
    edges = cv2.Canny(height_map, 50, 150)
    
    kernel = np.ones((3, 3), np.uint8)
    dilated_edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Soften edges
    soft_edges = cv2.GaussianBlur(dilated_edges, (5, 5), 0)
    
    highlight_mask = (soft_edges.astype(np.float32) / 255.0) * sparkle_level
    return highlight_mask

def apply_metallic_response(final_img, warped_tex, floor_mask, lighting_data, shadow_map, realism_mode="Premium", material_depth="Standard", metallic_intensity=50):
    """
    realism_mode: "Fast", "Balanced", "Premium"
    material_depth: "Standard" (depth 0.3, sparkle 0.2), "Enhanced" (0.6, 0.5), "Premium" (0.9, 0.8)
    metallic_intensity: 0 - 100 mapped to 0.0 - 0.7
    """
    if realism_mode == "Fast":
        return final_img, np.zeros_like(floor_mask)
        
    # Mapping intensity
    mapped_intensity = (metallic_intensity / 100.0) * 0.7
    
    # Depth Profiles
    depth_level = 0.3
    sparkle_level = 0.2
    if material_depth == "Enhanced":
        depth_level = 0.6
        sparkle_level = 0.5
    elif material_depth == "Premium":
        depth_level = 0.9
        sparkle_level = 0.8
        
    if realism_mode == "Balanced":
        sparkle_level = 0.0 # Disable swirl enhancement for balanced
        
    tex_hash = _get_texture_hash(warped_tex)
    if tex_hash in _material_cache:
        height_map, metallic_map = _material_cache[tex_hash]
    else:
        height_map = generate_height_map(warped_tex)
        metallic_map = generate_metallic_map(warped_tex)
        
        # Maintain max cache size
        if len(_material_cache) >= MAX_CACHE_SIZE:
            _material_cache.pop(next(iter(_material_cache)))
        _material_cache[tex_hash] = (height_map, metallic_map)
        
    # Generate Swirl Highlight
    highlight_float = enhance_swirl_details(height_map, sparkle_level) if sparkle_level > 0.0 else np.zeros_like(height_map, dtype=np.float32)
    
    # Lighting Map
    h, w = final_img.shape[:2]
    light_map = np.zeros((h, w), dtype=np.float32)
    ambient = float(lighting_data.get("ambientBrightness", 0.5))
    light_map += ambient
    
    sources = lighting_data.get("sources", [])
    for src in sources:
        x, y, r, strength = src["x"], src["y"], src["radius"], src["strength"]
        temp = np.zeros((h, w), dtype=np.float32)
        cv2.circle(temp, (x, y), r * 3, float(strength), -1)
        # Apply blur dynamically based on radius
        blur_size = max(3, r)
        if blur_size % 2 == 0:
            blur_size += 1
        temp = cv2.GaussianBlur(temp, (blur_size, blur_size), sigmaX=r, sigmaY=r)
        light_map += temp
        
    light_map = np.clip(light_map, 0.0, 1.0)
    
    # Shadow Map attenuation (shadow_map is 0-255 where 255 is NO shadow)
    if shadow_map is not None:
        shadow_float = shadow_map.astype(np.float32) / 255.0
        light_map = light_map * shadow_float
    
    # Base metallic response
    metallic_float = metallic_map.astype(np.float32) / 255.0
    
    # Final response formula
    response_float = metallic_float * light_map * mapped_intensity * depth_level
    
    # Add swirl highlights, also attenuated by light_map and shadows
    total_response = response_float + (highlight_float * light_map * mapped_intensity)
    total_response = np.clip(total_response, 0.0, 1.0)
    
    # Mask it
    total_response[floor_mask == 0] = 0.0
    
    response_3d = np.expand_dims(total_response, axis=-1)
    
    img_float = final_img.astype(np.float32) / 255.0
    screened = 1.0 - (1.0 - img_float) * (1.0 - response_3d)
    
    final_metallic = np.clip(screened * 255.0, 0, 255).astype(np.uint8)
    
    response_preview = (total_response * 255).astype(np.uint8)
    
    return final_metallic, response_preview
