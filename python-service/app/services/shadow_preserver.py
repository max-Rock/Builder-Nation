import cv2
import numpy as np

def extract_shadow_map(image, floor_mask, active_object_masks=None):
    """
    Extracts the shadow map from the original image.
    Uses cv2.divide(gray, blurred, scale=255) to isolate illumination from material color.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply heavy blur to get illumination base
    blurred = cv2.GaussianBlur(gray, (31, 31), 0)
    
    # Division method for Retinex-style illumination extraction
    # 255 means no shadow (or brighter), and values < 255 are shadows.
    shadow_map = cv2.divide(gray, blurred, scale=255)
    
    # Areas outside the floor mask should not darken the image, so we set them to 255 (no shadow)
    shadow_map_floor = np.full_like(shadow_map, 255)
    shadow_map_floor[floor_mask > 0] = shadow_map[floor_mask > 0]
    
    # Optionally exclude active objects
    if active_object_masks:
        for obj_mask in active_object_masks:
            shadow_map_floor[obj_mask > 0] = 255
            
    # Contact shadow boost:
    # Boost shadows (+15%) near objects (contact_shadow_zone = dilate(object) - object)
    if active_object_masks:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        for obj_mask in active_object_masks:
            dilated = cv2.dilate(obj_mask, kernel, iterations=2)
            contact_zone = cv2.subtract(dilated, obj_mask)
            
            zone_mask = (contact_zone > 0) & (floor_mask > 0)
            
            # Apply boost only in the contact zone
            shadow_map_floor = shadow_map_floor.astype(np.float32)
            shadow_map_floor[zone_mask] = shadow_map_floor[zone_mask] * 0.85
            shadow_map_floor = np.clip(shadow_map_floor, 0, 255).astype(np.uint8)

    return shadow_map_floor

def blend_shadows(textured_img, shadow_map, finish="Glossy"):
    """
    Multiply blend the shadow_map into the textured_img.
    """
    # Finish Strength Table
    finish_multipliers = {
        "matte": 1.00,
        "satin": 0.85,
        "semi-gloss": 0.65,
        "glossy": 0.50,
        "high-gloss": 0.50
    }
    
    # Map finish if slightly different naming
    strength_multiplier = 1.0
    finish_lower = finish.lower()
    for key, val in finish_multipliers.items():
        if key in finish_lower:
            strength_multiplier = val
            break
            
    # Shadow map is 0-255 where 255 is no shadow and <255 is shadow.
    shadow_normalized = shadow_map.astype(np.float32) / 255.0
    intensity = 1.0 - shadow_normalized
    
    adjusted_intensity = intensity * strength_multiplier
    
    # Shadow clamping to prevent full blackening
    adjusted_intensity = np.clip(adjusted_intensity, 0.0, 0.8)
    
    result_multiplier = 1.0 - adjusted_intensity
    
    # Expand dims for broadcasting
    if len(result_multiplier.shape) == 2:
        result_multiplier = np.expand_dims(result_multiplier, axis=-1)
        
    blended = textured_img.astype(np.float32) * result_multiplier
    return np.clip(blended, 0, 255).astype(np.uint8)

def calculate_shadow_metrics(shadow_map, floor_mask):
    """
    Calculate coverage and strength metrics.
    """
    valid_pixels = floor_mask > 0
    if not np.any(valid_pixels):
        return 0.0, 0.0
        
    shadow_values = shadow_map[valid_pixels]
    
    # Shadow if < 240
    is_shadow = shadow_values < 240
    coverage = np.sum(is_shadow) / len(shadow_values)
    
    if np.any(is_shadow):
        strengths = 1.0 - (shadow_values[is_shadow] / 255.0)
        avg_strength = np.mean(strengths)
    else:
        avg_strength = 0.0
        
    return round(float(coverage), 4), round(float(avg_strength), 4)
