import cv2
import numpy as np

def analyze_lighting(image_bgr):
    """
    Analyzes the image for bright light sources, windows, and reflections.
    Returns a dictionary containing lighting metrics and a list of sources.
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    
    # Calculate ambient brightness
    ambient = float(np.mean(gray))
    ambient_brightness = round(ambient / 255.0, 4)
    
    # Determine lighting type
    if ambient_brightness < 0.3:
        lighting_type = "dark"
    elif ambient_brightness > 0.7:
        lighting_type = "bright"
    else:
        lighting_type = "normal"
        
    # Adaptive thresholding based on ambient brightness
    threshold = max(180, min(245, int(ambient + 60)))
    
    _, thresh = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    sources = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 10:  # Ignore tiny specks of noise
            continue
            
        # Get minimum enclosing circle for radius
        (cx_float, cy_float), radius_float = cv2.minEnclosingCircle(contour)
        cx = int(cx_float)
        cy = int(cy_float)
        radius = int(radius_float)
        
        # Calculate strength (mean intensity inside this contour)
        # Create a mask for just this contour
        contour_mask = np.zeros_like(gray)
        cv2.drawContours(contour_mask, [contour], 0, 255, -1)
        mean_intensity = cv2.mean(gray, mask=contour_mask)[0]
        strength = round(mean_intensity / 255.0, 4)
        
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = float(w) / h if h > 0 else 1.0
        
        source_type = "light"
        # Windows tend to be much larger and wider/taller, lights tend to be small and round
        is_large = area > 1500 or w > 100 or h > 100
        is_elongated = aspect_ratio > 2.5 or aspect_ratio < 0.4
        if is_large or is_elongated:
            source_type = "window"
            
        sources.append({
            "x": cx,
            "y": cy,
            "radius": max(2, radius),  # Ensure radius is at least 2
            "strength": strength,
            "type": source_type
        })
        
    # Sort sources by area (which correlates with radius) descending
    sources.sort(key=lambda s: s["radius"], reverse=True)
    
    return {
        "ambientBrightness": ambient_brightness,
        "lightingType": lighting_type,
        "sources": sources
    }
