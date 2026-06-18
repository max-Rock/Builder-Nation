import os
import urllib.request
import torch
import cv2
import numpy as np
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_small.pt"
MODEL_CFG = "configs/sam2/sam2_hiera_s.yaml"

def get_models_dir():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "models", "sam2", "checkpoints")

def download_checkpoint_if_not_exists():
    models_dir = get_models_dir()
    os.makedirs(models_dir, exist_ok=True)
    checkpoint_path = os.path.join(models_dir, "sam2_hiera_small.pt")
    
    if not os.path.exists(checkpoint_path):
        print(f"Downloading SAM2 checkpoint to {checkpoint_path}...")
        urllib.request.urlretrieve(CHECKPOINT_URL, checkpoint_path)
        print("Download complete.")
        
    return checkpoint_path

predictor = None

def get_predictor():
    global predictor
    if predictor is None:
        checkpoint_path = download_checkpoint_if_not_exists()
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading SAM2 model on device: {device}")
        
        # Build SAM2 model
        sam2_model = build_sam2(MODEL_CFG, checkpoint_path, device=device)
        predictor = SAM2ImagePredictor(sam2_model)
        
    return predictor

def detect_floor_mask(image_bgr):
    """
    Detects the floor in the given BGR image using SAM2.
    Uses bottom-center, bottom-left, and bottom-right points as prompts.
    """
    pred = get_predictor()
    
    # SAM2 expects RGB images
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    pred.set_image(image_rgb)
    
    h, w = image_bgr.shape[:2]
    
    # Generate seed points near the bottom of the image
    # Assuming floor is at the bottom
    points = np.array([
        [w // 2, int(h * 0.9)],        # bottom-center
        [int(w * 0.25), int(h * 0.9)], # bottom-left
        [int(w * 0.75), int(h * 0.9)]  # bottom-right
    ])
    labels = np.array([1, 1, 1]) # 1 indicates foreground (floor)
    
    masks, scores, logits = pred.predict(
        point_coords=points,
        point_labels=labels,
        multimask_output=False # We want a single mask
    )
    
    mask = masks[0]
    score = float(scores[0])
    
    # Convert mask to uint8 for OpenCV
    mask_uint8 = (mask * 255).astype(np.uint8)
    
    # Ensure mask is exactly 2D (H, W)
    if len(mask_uint8.shape) > 2:
        mask_uint8 = np.squeeze(mask_uint8)
        
    return mask_uint8, score
