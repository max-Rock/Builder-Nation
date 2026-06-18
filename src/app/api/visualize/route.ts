import { NextRequest, NextResponse } from "next/server";

const cleanBase64 = (str: string) => {
  if (str.startsWith("data:")) {
    return str.split(",")[1];
  }
  return str;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mask, prompt } = body;

    if (!image || !mask || !prompt) {
      return NextResponse.json(
        { success: false, message: "Missing image, mask, or prompt." },
        { status: 400 }
      );
    }

    const cleanedImage = cleanBase64(image);
    const cleanedMask = cleanBase64(mask);

    const hfToken = process.env.HF_ACCESS_TOKEN || "";
    
    // Call Hugging Face serverless Inference API for Stable Diffusion Inpainting
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
        },
        body: JSON.stringify({
          inputs: {
            image: cleanedImage,
            mask_image: cleanedMask,
            prompt: prompt,
          },
        }),
      }
    );

    // If model is loading, Hugging Face returns 503
    if (response.status === 503) {
      const data = await response.json();
      return NextResponse.json(
        {
          success: false,
          isLoading: true,
          message: data.error || "Model is currently loading",
          estimatedTime: data.estimated_time || 20.0,
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error response:", errorText);
      return NextResponse.json(
        {
          success: false,
          message: `Hugging Face API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Convert binary image response to base64
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${base64Image}`,
    });

  } catch (error: any) {
    console.error("AI Visualization handler error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
