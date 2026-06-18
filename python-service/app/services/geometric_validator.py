import numpy as np
import cv2

def calculate_confidence(mask_uint8, corners, image_width, image_height):
    total_pixels = image_width * image_height
    floor_pixels = np.count_nonzero(mask_uint8)
    
    if total_pixels == 0:
        return {"confidence": 0, "status": "poor", "needsAdjustment": True, "reason": "invalid_image", "metrics": {}}

    # 1. Area Score (Coverage)
    coverage = floor_pixels / total_pixels
    
    if 0.15 <= coverage <= 0.70:
        area_score = 1.0
    elif 0.05 <= coverage < 0.15:
        area_score = (coverage - 0.05) / 0.10 * 0.5 + 0.5 # 0.5 to 1.0
    elif 0.70 < coverage <= 0.85:
        area_score = (0.85 - coverage) / 0.15 * 0.5 + 0.5 # 1.0 to 0.5
    else:
        area_score = 0.2
        
    # 2. Bottom Contact Score
    # Look at the bottom 5% of the image
    bottom_strip = mask_uint8[-max(1, int(image_height * 0.05)):, :]
    bottom_contact = np.any(bottom_strip > 0, axis=0)
    bottom_contact_pixels = np.sum(bottom_contact)
    bottom_contact_score = float(bottom_contact_pixels / image_width)
    
    # 3. Shape Score
    # Polygon area vs Mask area
    pts_dst = np.array([[c['x'], c['y']] for c in corners], dtype=np.int32)
    poly_area = cv2.contourArea(pts_dst)
    
    if poly_area > 0 and floor_pixels > 0:
        shape_score = float(min(poly_area, floor_pixels) / max(poly_area, floor_pixels))
    else:
        shape_score = 0.0
        
    # 4. Corner Score (Convexity)
    hull = cv2.convexHull(pts_dst)
    hull_area = cv2.contourArea(hull)
    if hull_area > 0:
        corner_score = float(poly_area / hull_area)
    else:
        corner_score = 0.0
        
    # Final Confidence (Weighted)
    confidence = (
        area_score * 0.40 +
        bottom_contact_score * 0.30 +
        shape_score * 0.20 +
        corner_score * 0.10
    )
    
    # Determine status and reason
    reason = None
    if confidence >= 0.90:
        status = "excellent"
    elif confidence >= 0.75:
        status = "good"
    elif confidence >= 0.60:
        status = "review"
    else:
        status = "poor"
        
    if status in ["review", "poor"]:
        if bottom_contact_score < 0.2:
            reason = "floor_does_not_touch_bottom"
        elif coverage < 0.05:
            reason = "coverage_too_small"
        elif coverage > 0.85:
            reason = "coverage_too_large"
        elif shape_score < 0.6:
            reason = "irregular_polygon_shape"
        else:
            reason = "low_confidence"
            
    needs_adjustment = confidence < 0.75
    
    return {
        "confidence": round(confidence, 4),
        "status": status,
        "needsAdjustment": needs_adjustment,
        "reason": reason,
        "metrics": {
            "coverage": round(coverage, 4),
            "bottomContact": round(bottom_contact_score, 4),
            "shapeScore": round(shape_score, 4),
            "areaScore": round(area_score, 4)
        }
    }
