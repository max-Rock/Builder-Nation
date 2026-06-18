"use client";

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Line } from "react-konva";
import useImage from "use-image";

interface CornerSelectorProps {
  imageUrl: string;
  initialCorners?: {x: number, y: number}[];
  onCornersChange: (corners: {x: number, y: number}[]) => void;
}

export default function CornerSelector({ imageUrl, initialCorners, onCornersChange }: CornerSelectorProps) {
  const [image] = useImage(imageUrl);
  
  // Container ref to size the canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 4 corners: TL, TR, BR, BL
  const [corners, setCorners] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize corners when image loads or size changes
  useEffect(() => {
    if (image && size.width > 0 && size.height > 0) {
      // Calculate scale to fit image in container
      const scaleX = size.width / image.width;
      const scaleY = size.height / image.height;
      const scale = Math.min(scaleX, scaleY);
      setImageScale(scale);
      
      const dw = image.width * scale;
      const dh = image.height * scale;
      
      const ox = (size.width - dw) / 2;
      const oy = (size.height - dh) / 2;
      setOffset({ x: ox, y: oy });

      if (initialCorners && initialCorners.length === 4) {
        // Map from original image coordinates to canvas coordinates
        const scaledCorners = initialCorners.map(c => ({
          x: (c.x * scale) + ox,
          y: (c.y * scale) + oy
        }));
        setCorners(scaledCorners);
      } else {
        // Default corners to a rectangle inside the image
        const paddingX = dw * 0.2;
        const paddingY = dh * 0.2;
        
        const defaultCorners = [
          { x: ox + paddingX, y: oy + paddingY }, // TL
          { x: ox + dw - paddingX, y: oy + paddingY }, // TR
          { x: ox + dw - paddingX, y: oy + dh - paddingY }, // BR
          { x: ox + paddingX, y: oy + dh - paddingY } // BL
        ];
        setCorners(defaultCorners);
      }
    }
  }, [image, size, initialCorners]);

  // Report corners back, mapped to original image coordinates
  useEffect(() => {
    if (corners.length === 4 && imageScale > 0) {
      const originalCoords = corners.map(c => ({
        x: (c.x - offset.x) / imageScale,
        y: (c.y - offset.y) / imageScale
      }));
      onCornersChange(originalCoords);
    }
  }, [corners, imageScale, offset, onCornersChange]);

  const handleDragMove = (index: number, e: any) => {
    const newCorners = [...corners];
    newCorners[index] = {
      x: e.target.x(),
      y: e.target.y()
    };
    setCorners(newCorners);
  };

  if (!image) return <div ref={containerRef} className="w-full h-full flex items-center justify-center text-white">Loading image...</div>;

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 rounded-sm overflow-hidden relative">
      <Stage width={size.width} height={size.height}>
        <Layer>
          {/* Base Image */}
          <KonvaImage
            image={image}
            x={offset.x}
            y={offset.y}
            width={image.width * imageScale}
            height={image.height * imageScale}
          />
          
          {/* Semi-transparent overlay outside the polygon */}
          {/* For simplicity, we just draw the polygon outline with a fill and some opacity */}
          
          {corners.length === 4 && (
            <>
              {/* Connecting Lines */}
              <Line
                points={[
                  corners[0].x, corners[0].y,
                  corners[1].x, corners[1].y,
                  corners[2].x, corners[2].y,
                  corners[3].x, corners[3].y,
                  corners[0].x, corners[0].y
                ]}
                stroke="#D4AF37" // brand-gold
                strokeWidth={2}
                fill="rgba(212, 175, 55, 0.2)"
                closed={true}
              />
              
              {/* Draggable Corner Handles */}
              {corners.map((c, i) => (
                <Circle
                  key={i}
                  x={c.x}
                  y={c.y}
                  radius={12}
                  fill="#D4AF37"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => handleDragMove(i, e)}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                  onDragStart={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grabbing';
                  }}
                  onDragEnd={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grab';
                  }}
                />
              ))}
            </>
          )}
        </Layer>
      </Stage>
      <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
        <span className="bg-black/60 text-white px-4 py-2 rounded-sm text-xs font-bold tracking-wider shadow-lg">
          Drag the 4 corners to fit your floor area
        </span>
      </div>
    </div>
  );
}
