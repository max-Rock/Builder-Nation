import { NextRequest, NextResponse } from "next/server";
import { PNG } from "pngjs";
import { HfInference } from "@huggingface/inference";

// ─── Configuration ───────────────────────────────────────────────────

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/nvidia/segformer-b0-finetuned-ade-512-512";

/**
 * ADE20K labels that represent the "floor" surface.
 * The epoxy texture will be applied to pixels matching these labels.
 */
const FLOOR_LABELS = new Set([
  "floor",
  "flooring",
  "floor, flooring",
  "carpet",
  "rug",
  "mat",
  "path",
  "runway",
  "stage",
]);

/**
 * ADE20K labels that represent objects/obstructions ABOVE the floor.
 * Pixels matching these labels are SUBTRACTED from the floor mask.
 * This is intentionally broad — anything that isn't "floor" and sits on it
 * should be excluded so the epoxy texture only shows on exposed floor.
 */
const OBSTACLE_LABELS = new Set([
  // Furniture
  "table",
  "chair",
  "armchair",
  "sofa",
  "couch",
  "bed",
  "desk",
  "cabinet",
  "counter",
  "countertop",
  "counter top",
  "shelf",
  "bookcase",
  "wardrobe",
  "chest of drawers",
  "chest",
  "stool",
  "bench",
  "ottoman",
  "coffee table",
  "dining table",
  "nightstand",
  "sideboard",
  "buffet",
  "dresser",
  "drawer",
  "swivel chair",
  "seat",
  // Appliances & electronics
  "television receiver",
  "television",
  "tv",
  "screen",
  "monitor",
  "computer",
  "refrigerator",
  "stove",
  "oven",
  "microwave",
  "washer",
  "dishwasher",
  "fan",
  "radiator",
  "heater",
  "air conditioner",
  // People & animals
  "person",
  "people",
  "human",
  "animal",
  "dog",
  "cat",
  // Plants & decorations
  "plant",
  "flower",
  "pot",
  "vase",
  "sculpture",
  "painting",
  "poster",
  // Misc objects that sit on the floor
  "lamp",
  "light",
  "chandelier",
  "curtain",
  "blind",
  "box",
  "bag",
  "basket",
  "trash can",
  "bin",
  "toy",
  "ball",
  "shoe",
  "boot",
  "bottle",
  "glass",
  "plate",
  "tray",
  "rug",
  "towel",
  // Structural that isn't floor
  "pillar",
  "column",
  "railing",
  "bannister",
  "stairway",
  "stairs",
  "step",
  "escalator",
  "fireplace",
  // Walls, windows, doors, ceiling — critical for depth understanding
  "wall",
  "window",
  "windowpane",
  "window-blind",
  "door",
  "ceiling",
  "sky",
  "tree",
  "grass",
  "earth",
  "mountain",
  "water",
  "sea",
  "river",
  "road",
  "sidewalk",
  "fence",
  "awning",
  "canopy",
  "signboard",
  "building",
  "house",
  "skyscraper",
  "bridge",
  "rock",
  "sand",
  "snow",
]);

// ─── Helpers ─────────────────────────────────────────────────────────

const cleanBase64 = (str: string) => {
  if (str.startsWith("data:")) {
    return str.split(",")[1];
  }
  return str;
};

/**
 * Check if a segment label matches any entry in a label set.
 * Uses substring matching because ADE20K labels can be compound
 * (e.g. "floor, flooring", "chest of drawers, chest, bureau").
 */
function matchesLabelSet(segmentLabel: string, labelSet: Set<string>): boolean {
  const lower = segmentLabel.toLowerCase().trim();
  // Direct match
  if (labelSet.has(lower)) return true;
  // Check if any known label is a substring of the segment label
  for (const known of labelSet) {
    if (lower.includes(known)) return true;
  }
  // Check if segment label is a substring of any known label
  for (const known of labelSet) {
    if (known.includes(lower) && lower.length > 2) return true;
  }
  return false;
}

/**
 * Decode a base64-encoded grayscale/RGBA PNG mask into a flat Uint8Array
 * of luminance values (one per pixel), along with width and height.
 */
function decodeMaskPng(base64Data: string): { data: Uint8Array; width: number; height: number } {
  const buffer = Buffer.from(base64Data, "base64");
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;

  // Extract luminance from RGBA pixel data
  const luminance = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    // HF masks are typically white-on-black, use the red channel as luminance
    luminance[i] = data[i * 4];
  }
  return { data: luminance, width, height };
}

/**
 * Encode a luminance Uint8Array back to a base64 PNG string.
 */
function encodeMaskPng(luminance: Uint8Array, width: number, height: number): string {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const val = luminance[i];
    png.data[i * 4] = val;     // R
    png.data[i * 4 + 1] = val; // G
    png.data[i * 4 + 2] = val; // B
    png.data[i * 4 + 3] = 255; // A
  }
  const pngBuffer = PNG.sync.write(png);
  return pngBuffer.toString("base64");
}

/**
 * Generate a heuristic fallback mask: gradient from black (top) to white (bottom).
 * This simulates a typical room perspective where the floor is the lower portion.
 */
function generateFallbackMask(width: number, height: number): string {
  const luminance = new Uint8Array(width * height);
  const floorStartRatio = 0.55; // Floor begins at ~55% from top
  const transitionZone = 0.1;   // Gradient blend zone

  for (let y = 0; y < height; y++) {
    const ratio = y / height;
    let value = 0;
    if (ratio > floorStartRatio + transitionZone) {
      value = 255;
    } else if (ratio > floorStartRatio) {
      value = Math.round(((ratio - floorStartRatio) / transitionZone) * 255);
    }
    for (let x = 0; x < width; x++) {
      luminance[y * width + x] = value;
    }
  }
  return encodeMaskPng(luminance, width, height);
}

// ─── Route Handler ───────────────────────────────────────────────────



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, message: "Missing image data." },
        { status: 400 }
      );
    }

    const cleanedImage = cleanBase64(image);
    const hfToken = process.env.HF_ACCESS_TOKEN || "";

    // ── Call Hugging Face Segformer using HF Inference client ──
    let segments: any[] = [];
    try {
      const hf = new HfInference(hfToken || undefined);
      // The client expects raw image bytes; our image is base64 data URI, so we strip the prefix
      const base64Data = cleanedImage.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const imageBlob = new Blob([imageBuffer], { type: "image/png" });
      segments = await hf.imageSegmentation({
        model: "nvidia/segformer-b0-finetuned-ade-512-512",
        inputs: imageBlob,
      });
    } catch (apiErr: any) {
      console.warn(
        "Hugging Face inference call failed. Using heuristic fallback mask.",
        apiErr.message
      );
      const fallbackMask = generateFallbackMask(512, 512);
      return NextResponse.json({
        success: true,
        mask: `data:image/png;base64,${fallbackMask}`,
        simulated: true,
        detectedLabels: [],
        excludedLabels: [],
      });
    }

    // The HF client returns an array of segment objects directly


    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No segments detected in the image.",
      });
    }

    // ── Classify each segment ──

    const floorSegments: typeof segments = [];
    const obstacleSegments: typeof segments = [];
    const allDetectedLabels: string[] = [];

    for (const seg of segments) {
      allDetectedLabels.push(seg.label);
      if (matchesLabelSet(seg.label, FLOOR_LABELS)) {
        floorSegments.push(seg);
      } else if (matchesLabelSet(seg.label, OBSTACLE_LABELS)) {
        obstacleSegments.push(seg);
      }
      // Labels that match neither (wall, ceiling, window, door, sky, etc.)
      // are simply ignored — they won't appear in the floor mask anyway.
    }

    if (floorSegments.length === 0) {
      // No floor found — try treating any unmatched bottom-heavy segment as floor
      // (fallback heuristic when label names don't match our set)
      return NextResponse.json({
        success: false,
        message: `No floor detected. Found labels: ${allDetectedLabels.join(", ")}`,
        detectedLabels: allDetectedLabels,
      });
    }

    // ── Composite the final mask ──
    // 1. Start with the union of all floor segment masks (OR merge)
    // 2. Subtract all obstacle segment masks (AND NOT)

    // Decode the first floor mask to get dimensions
    const firstFloor = decodeMaskPng(floorSegments[0].mask);
    const { width, height } = firstFloor;
    const compositeMask = new Uint8Array(width * height);

    // Step 1: Union all floor masks
    // Start with the first floor mask
    for (let i = 0; i < compositeMask.length; i++) {
      compositeMask[i] = firstFloor.data[i];
    }

    // OR-merge additional floor masks
    for (let f = 1; f < floorSegments.length; f++) {
      const decoded = decodeMaskPng(floorSegments[f].mask);
      for (let i = 0; i < compositeMask.length; i++) {
        compositeMask[i] = Math.max(compositeMask[i], decoded.data[i]);
      }
    }

    // Step 2: Subtract all obstacle masks
    const excludedLabels: string[] = [];
    for (const obs of obstacleSegments) {
      const decoded = decodeMaskPng(obs.mask);
      let hasOverlap = false;
      for (let i = 0; i < compositeMask.length; i++) {
        if (decoded.data[i] > 127 && compositeMask[i] > 0) {
          hasOverlap = true;
          // Subtract: where obstacle is white, set floor mask to black
          compositeMask[i] = Math.max(0, compositeMask[i] - decoded.data[i]);
        }
      }
      if (hasOverlap) {
        excludedLabels.push(obs.label);
      }
    }

    // Log all detected labels for debugging
    console.log("[Segment] All detected labels:", allDetectedLabels);
    console.log("[Segment] Floor segments:", floorSegments.map((s: any) => s.label));
    console.log("[Segment] Obstacle segments:", obstacleSegments.map((s: any) => s.label));

    // Step 3: Vertical position weighting — floor is in the lower portion of room photos.
    // Suppress false positives in the upper part of the image where walls/windows live.
    for (let y = 0; y < height; y++) {
      const ratio = y / height;
      let weight = 1.0;
      if (ratio < 0.40) {
        // Top 40% — virtually never floor in a room photo
        weight = 0;
      } else if (ratio < 0.55) {
        // Transition zone (40%–55%) — gradual ramp
        weight = (ratio - 0.40) / 0.15;
      }
      // Bottom 45% keeps full weight (1.0)
      if (weight < 1.0) {
        for (let x = 0; x < width; x++) {
          compositeMask[y * width + x] = Math.round(compositeMask[y * width + x] * weight);
        }
      }
    }

    // Step 4: Morphological erosion — remove thin noisy edges.
    // 2 passes of 3×3 minimum filter shrinks the mask by ~2px on every border,
    // eliminating stray single-pixel leaks onto walls/windows.
    let eroded = new Uint8Array(compositeMask);
    for (let pass = 0; pass < 2; pass++) {
      const src = eroded;
      eroded = new Uint8Array(src.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let minVal = 255;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                minVal = Math.min(minVal, src[ny * width + nx]);
              } else {
                minVal = 0; // Treat out-of-bounds as black
              }
            }
          }
          eroded[y * width + x] = minVal;
        }
      }
    }

    // Step 5: Re-threshold to make a clean binary mask
    for (let i = 0; i < eroded.length; i++) {
      eroded[i] = eroded[i] > 100 ? 255 : 0;
    }

    // Step 6: Morphological dilation — grow back the mask slightly after erosion
    // so the floor coverage isn't too shrunken. 1 pass of 3×3 max filter.
    let dilated = new Uint8Array(eroded);
    {
      const src = dilated;
      dilated = new Uint8Array(src.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let maxVal = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                maxVal = Math.max(maxVal, src[ny * width + nx]);
              }
            }
          }
          dilated[y * width + x] = maxVal;
        }
      }
    }

    // Step 7: Edge feathering — 5×5 Gaussian blur to create soft, natural-looking edges.
    // This prevents the harsh "cut-out" look at mask boundaries.
    const feathered = new Uint8Array(dilated.length);
    // Approximate 5×5 Gaussian kernel (σ≈1.0)
    const kernel = [
      1, 4, 7, 4, 1,
      4, 16, 26, 16, 4,
      7, 26, 41, 26, 7,
      4, 16, 26, 16, 4,
      1, 4, 7, 4, 1,
    ];
    const kernelSum = kernel.reduce((a, b) => a + b, 0); // 273
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let wSum = 0;
        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const nx = x + kx;
            const ny = y + ky;
            const ki = (ky + 2) * 5 + (kx + 2);
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += dilated[ny * width + nx] * kernel[ki];
              wSum += kernel[ki];
            }
          }
        }
        feathered[y * width + x] = Math.round(sum / wSum);
      }
    }

    // Step 8: Final threshold with soft edges — keep feathered values
    // but suppress very faint areas (< 15 out of 255)
    for (let i = 0; i < feathered.length; i++) {
      if (feathered[i] < 15) feathered[i] = 0;
    }

      // ---- Heuristic fallback: if mask is almost empty, generate a floor gradient ----
      const maskPixelCount = feathered.reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0);
      const totalPixels = feathered.length;
      const occupancy = maskPixelCount / totalPixels;
      if (occupancy < 0.05) {
        // Less than 5% of pixels are marked as floor – assume model failed and use fallback
        const fallbackMask = generateFallbackMask(width, height);
        return NextResponse.json({
          success: true,
          mask: `data:image/png;base64,${fallbackMask}`,
          simulated: true,
          detectedLabels: floorSegments.map((s: any) => s.label),
          excludedLabels,
          allLabels: allDetectedLabels,
          message: "Model mask too sparse – using heuristic floor mask.",
        });
      }

      const finalMaskBase64 = encodeMaskPng(feathered, width, height);

      return NextResponse.json({
        success: true,
        mask: `data:image/png;base64,${finalMaskBase64}`,
        detectedLabels: floorSegments.map((s: any) => s.label),
        excludedLabels,
        allLabels: allDetectedLabels,
      });
  } catch (error: any) {
    console.error("AI Segmentation handler error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
