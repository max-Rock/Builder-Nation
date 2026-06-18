import os
import cv2
import numpy as np
import torch
from ultralytics import YOLO
from app.services.segment_floor import get_predictor

_yolo_model = None

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        print("Loading YOLO-World model...")
        _yolo_model = YOLO("yolov8s-world.pt")
        classes = ["person", "chair", "couch", "table", "bed", "plant", "dog", "cat", "rug", "carpet"]
        _yolo_model.set_classes(classes)
    return _yolo_model

def detect_objects(image_bgr):
    """
    Detects objects using YOLO-World and generates precise masks using SAM2.
    Returns: list of {"class": class_name, "mask": uint8_mask, "coverage": float}
    """
    yolo = get_yolo_model()
    sam2_pred = get_predictor()
    
    # YOLO prediction
    results = yolo(image_bgr, verbose=False)
    
    detected_objects = []
    h, w = image_bgr.shape[:2]
    total_pixels = h * w
    
    # We must ensure SAM2 is set with the current image.
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    sam2_pred.set_image(image_rgb)
    
    for result in results:
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            continue
            
        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            if conf < 0.15: # Lower confidence threshold for custom classes like rug
                continue
                
            class_name = yolo.names[cls_id]
            
            # Get bounding box coordinates [x1, y1, x2, y2]
            xyxy = box.xyxy[0].cpu().numpy()
            
            # Use SAM2 to get precise mask from bounding box
            masks, scores, _ = sam2_pred.predict(
                box=xyxy[None, :], # SAM2 expects N x 4
                multimask_output=False
            )
            
            if len(masks) > 0:
                mask = masks[0]
                mask_uint8 = (mask * 255).astype(np.uint8)
                
                obj_pixels = np.count_nonzero(mask_uint8)
                coverage = float(obj_pixels / total_pixels)
                
                detected_objects.append({
                    "class": class_name,
                    "mask": mask_uint8,
                    "coverage": round(coverage, 4),
                    "score": round(conf, 4)
                })
                
    return detected_objects
