"use client";

import React, { useRef, useEffect, useState } from "react";

interface MaskBrushProps {
  imageUrl: string;
  brushAction: "erase" | "restore";
  onMaskChange: (blob: Blob | null) => void;
}

export default function MaskBrush({ imageUrl, brushAction, onMaskChange }: MaskBrushProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const isDrawing = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          // Initialize transparent
          ctx.clearRect(0, 0, img.width, img.height);
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !containerRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // object-fit: contain math
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const scale = Math.max(scaleX, scaleY);
    
    const displayWidth = canvas.width / scale;
    const displayHeight = canvas.height / scale;
    
    const offsetX = (rect.width - displayWidth) / 2;
    const offsetY = (rect.height - displayHeight) / 2;

    const x = (e.clientX - rect.left - offsetX) * scale;
    const y = (e.clientY - rect.top - offsetY) * scale;

    return { x, y };
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>, isStart: boolean) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const coords = getCoordinates(e);
    if (!ctx || !coords) return;

    ctx.lineWidth = 50;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // We draw black for erase, white for restore
    ctx.strokeStyle = brushAction === "erase" ? "black" : "white";

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    } else {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    draw(e, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    draw(e, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Export to blob
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        onMaskChange(blob);
      }, "image/png");
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-30 w-full h-full overflow-hidden flex items-center justify-center">
      <img src={imageUrl} alt="Room" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50" />
      <canvas
        ref={canvasRef}
        className="absolute w-full h-full object-contain cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
