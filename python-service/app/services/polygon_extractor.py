import cv2
import numpy as np

def extract_four_corners(mask):
    """
    Extracts exactly 4 corners from a binary mask using minimum area rectangle.
    This guarantees 4 points for texture mapping, avoiding complex contour approximation.
    """
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return []
        
    # Get largest contour
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Get minimum area bounding rectangle
    rect = cv2.minAreaRect(largest_contour)
    box = cv2.boxPoints(rect)
    box = np.int32(box) # Convert to integer coordinates
    
    # Sort points to be top-left, top-right, bottom-right, bottom-left
    # Order: [x, y]
    # Sum of coords is smallest for top-left, largest for bottom-right
    # Diff (y-x) is smallest for top-right, largest for bottom-left
    s = box.sum(axis=1)
    diff = np.diff(box, axis=1)
    
    rect_ordered = np.zeros((4, 2), dtype=int)
    rect_ordered[0] = box[np.argmin(s)]       # top-left
    rect_ordered[2] = box[np.argmax(s)]       # bottom-right
    rect_ordered[1] = box[np.argmin(diff)]    # top-right
    rect_ordered[3] = box[np.argmax(diff)]    # bottom-left
    
    # Convert to list of dicts for JSON serialization
    corners = [{"x": int(pt[0]), "y": int(pt[1])} for pt in rect_ordered]
    return corners
