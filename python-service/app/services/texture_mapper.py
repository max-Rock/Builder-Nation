import cv2
import numpy as np

def apply_texture_to_floor(room_img, tex_img, corners, opacity=100, custom_mask=None):
    """
    Applies the texture to the room image at the specified corners.
    room_img: BGR numpy array
    tex_img: BGR numpy array
    corners: list of dicts [{'x': x, 'y': y}, ...]
    opacity: 0-100
    custom_mask: optional pre-calculated binary mask (uint8)
    """
    # Normalize texture size to 2048x2048
    tex_img = cv2.resize(tex_img, (2048, 2048), interpolation=cv2.INTER_AREA)
    
    pts_dst = np.array([[c['x'], c['y']] for c in corners], dtype=np.float32)
    
    # Texture corners (source) - Ordered top-left, top-right, bottom-right, bottom-left
    pts_src = np.array([
        [0, 0],
        [2048, 0],
        [2048, 2048],
        [0, 2048]
    ], dtype=np.float32)
    
    # Perspective Transform
    M = cv2.getPerspectiveTransform(pts_src, pts_dst)
    
    h, w = room_img.shape[:2]
    warped_tex = cv2.warpPerspective(tex_img, M, (w, h))
    
    # Create or use mask
    if custom_mask is not None:
        mask = custom_mask
        if len(mask.shape) == 3:
            mask = mask[:, :, 0]
    else:
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillConvexPoly(mask, pts_dst.astype(np.int32), 255)
    
    # Blending (Multiply + Overlay + Opacity)
    room_float = room_img.astype(np.float32) / 255.0
    tex_float = warped_tex.astype(np.float32) / 255.0
    
    # Multiply blend
    multiply_blend = room_float * tex_float
    
    # Overlay blend
    overlay_blend = np.where(
        room_float < 0.5,
        2 * room_float * tex_float,
        1 - 2 * (1 - room_float) * (1 - tex_float)
    )
    
    # Combined blend
    combined_blend = (multiply_blend * 0.5) + (overlay_blend * 0.5)
    combined_blend_8u = (combined_blend * 255).astype(np.uint8)
    
    # Apply opacity
    alpha = opacity / 100.0
    
    # Apply the blend only where the mask is active
    final_img = room_img.copy()
    mask_bool = mask > 0
    
    final_img[mask_bool] = (room_img[mask_bool] * (1 - alpha) + combined_blend_8u[mask_bool] * alpha).astype(np.uint8)
    
    return final_img, warped_tex
