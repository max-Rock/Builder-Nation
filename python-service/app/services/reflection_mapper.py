import cv2
import numpy as np

def get_finish_strength(finish_type):
    mapping = {
        "matte": 0.03,
        "satin": 0.18,
        "semigloss": 0.45,
        "highgloss": 0.75
    }
    # Handle variations in naming
    norm_finish = finish_type.lower().replace("-", "")
    return mapping.get(norm_finish, 0.45)

def build_reflection_map(image_shape, sources, floor_mask, finish_type):
    """
    Step 1 & 2 & 3: Creates the reflection map by mirroring lights and drawing blurred blobs.
    """
    h, w = image_shape[:2]
    reflection_map = np.zeros((h, w), dtype=np.uint8)
    
    strength_multiplier = get_finish_strength(finish_type)
    if strength_multiplier <= 0.01:
        return reflection_map
        
    for source in sources:
        x = source["x"]
        y = source["y"]
        radius = source["radius"]
        strength = source["strength"]
        source_type = source.get("type", "light")
        
        # Mirror downward across the horizontal center line
        # This is a fake but visually convincing heuristic
        ref_y = h - y
        if ref_y < 0 or ref_y > h:
            continue
            
        # Perspective scale: blobs lower on the screen (closer to camera) appear more elongated
        distance_factor = (ref_y / h)
        stretch_factor = 1.0 + distance_factor * 3.0
        
        ref_radius_x = int(radius * 1.5)
        ref_radius_y = int(radius * stretch_factor * 2.0)
        
        # Windows produce wider, softer, and more diffuse reflections
        if source_type == "window":
            ref_radius_x = int(radius * 3.0)
            ref_radius_y = int(radius * stretch_factor * 1.5)
            
        color = int(255 * strength * strength_multiplier)
        color = min(255, max(0, color))
        
        if color > 0:
            cv2.ellipse(reflection_map, (x, ref_y), (ref_radius_x, ref_radius_y), 0, 0, 360, color, -1)
            
    # Apply Gaussian Blur to soften the blobs
    blur_size = int(h * 0.15)
    if blur_size % 2 == 0:
        blur_size += 1
    
    if blur_size > 0:
        reflection_map = cv2.GaussianBlur(reflection_map, (blur_size, blur_size), 0)
        
    # Constrain to floor mask
    reflection_map = cv2.bitwise_and(reflection_map, floor_mask)
    
    return reflection_map

def apply_perspective_stretch(reflection_map):
    """
    Step 5: Apply vertical scaling to the reflection strength.
    Reflections stretch/strengthen toward the camera.
    """
    h, w = reflection_map.shape[:2]
    
    # Create a vertical gradient mask (weaker at horizon/top, stronger at camera/bottom)
    gradient = np.linspace(0.1, 1.0, h)
    gradient_map = np.tile(gradient[:, None], (1, w))
    
    stretched_map = reflection_map.astype(np.float32) * gradient_map
    return np.clip(stretched_map, 0, 255).astype(np.uint8)

def blend_reflections(base_img, reflection_map):
    """
    Blend using Screen mode.
    result = 255 - ((255 - base) * (255 - reflection) / 255)
    """
    base_float = base_img.astype(np.float32)
    ref_color = cv2.cvtColor(reflection_map, cv2.COLOR_GRAY2BGR).astype(np.float32)
    
    # Screen blend formula
    result = 255.0 - ((255.0 - base_float) * (255.0 - ref_color) / 255.0)
    return np.clip(result, 0, 255).astype(np.uint8)

def calculate_reflection_metrics(reflection_map, floor_mask):
    """
    Calculates the Reflection Score and Coverage.
    """
    floor_pixels = cv2.countNonZero(floor_mask)
    if floor_pixels == 0:
        return 0.0, 0.0
        
    # Score: Mean intensity of the reflection map over the floor
    score = cv2.mean(reflection_map, mask=floor_mask)[0] / 255.0
    
    # Coverage: Percentage of floor area with noticeable reflection
    _, ref_thresh = cv2.threshold(reflection_map, 10, 255, cv2.THRESH_BINARY)
    ref_and_floor = cv2.bitwise_and(ref_thresh, floor_mask)
    ref_pixels = cv2.countNonZero(ref_and_floor)
    
    coverage = ref_pixels / floor_pixels
    
    return round(score, 4), round(coverage, 4)
