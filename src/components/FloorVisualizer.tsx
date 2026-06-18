"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Droplets, Check, RefreshCw, Layers, UploadCloud, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { EpoxyFluidEngine } from "../lib/EpoxyFluidEngine";
import floorColors from "../data/floor-colors.json";
import dynamic from "next/dynamic";
import MaskBrush from "./MaskBrush";

const CornerSelector = dynamic(() => import("./CornerSelector"), { ssr: false });

type Phase = "MIX" | "FINISH" | "UPLOAD" | "DETECT_OPTION" | "PREVIEW";
type FinishType = "HighGloss" | "SemiGloss" | "Satin" | "Matte";
type ToolMode = "Pour" | "Mix";

export default function FloorVisualizer() {
  const [phase, setPhase] = useState<Phase>("MIX");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [engine, setEngine] = useState<EpoxyFluidEngine | null>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // Tools & Colors
  const [baseColor, setBaseColor] = useState(floorColors.base_colors[0].hex);
  const [selectedHighlight, setSelectedHighlight] = useState(floorColors.highlight_colors[0].hex);
  const [toolMode, setToolMode] = useState<ToolMode>("Pour");
  const [finish, setFinish] = useState<FinishType>("HighGloss");

  // Room Image State
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projection State
  const [corners, setCorners] = useState<{x: number, y: number}[]>([]);
  const [initialCorners, setInitialCorners] = useState<{x: number, y: number}[] | undefined>();
  const [detectionConfidence, setDetectionConfidence] = useState<number | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);
  const [detectionReason, setDetectionReason] = useState<string | null>(null);
  const [needsAdjustment, setNeedsAdjustment] = useState(false);
  
  type ExcludedObject = { class: string; coverage: number; maskUrl: string; maskFile: string };
  const [floorMaskUrl, setFloorMaskUrl] = useState<string | null>(null);
  const [floorMaskFile, setFloorMaskFile] = useState<string | null>(null);
  const [excludedObjects, setExcludedObjects] = useState<ExcludedObject[]>([]);
  const [activeExcludedObjects, setActiveExcludedObjects] = useState<Set<string>>(new Set());
  const [visibleFloorCoverage, setVisibleFloorCoverage] = useState<number | null>(null);
  
  type LightingSource = { x: number; y: number; radius: number; strength: number };
  type LightingData = { ambientBrightness: number; lightingType: string; sources: LightingSource[] };
  const [lightingData, setLightingData] = useState<LightingData | null>(null);
  const [showLightingAnalysis, setShowLightingAnalysis] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  
  const [visualDebugMode, setVisualDebugMode] = useState(false);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const [brushAction, setBrushAction] = useState<'erase' | 'restore'>('erase');
  const [userMaskBlob, setUserMaskBlob] = useState<Blob | null>(null);

  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string | null>(null);
  const [showMaskPreview, setShowMaskPreview] = useState(false);
  const [isDetectingFloor, setIsDetectingFloor] = useState(false);
  const [opacity, setOpacity] = useState(85);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [reflectionScore, setReflectionScore] = useState<number | null>(null);
  const [reflectionCoverage, setReflectionCoverage] = useState<number | null>(null);
  const [showReflectionDebug, setShowReflectionDebug] = useState(false);
  const [reflectionDebugUrl, setReflectionDebugUrl] = useState<string | null>(null);
  const [isLoadingReflectionDebug, setIsLoadingReflectionDebug] = useState(false);
  
  const [preserveShadows, setPreserveShadows] = useState(true);
  const [showShadowDebug, setShowShadowDebug] = useState(false);
  const [shadowDebugUrl, setShadowDebugUrl] = useState<string | null>(null);
  const [isLoadingShadowDebug, setIsLoadingShadowDebug] = useState(false);
  const [shadowCoverage, setShadowCoverage] = useState<number | null>(null);
  const [shadowStrength, setShadowStrength] = useState<number | null>(null);

  const [realismMode, setRealismMode] = useState<"Fast" | "Balanced" | "Premium">("Premium");
  const [materialDepth, setMaterialDepth] = useState<"Standard" | "Enhanced" | "Premium">("Standard");
  const [metallicIntensity, setMetallicIntensity] = useState(50);
  const [showMaterialDebug, setShowMaterialDebug] = useState(false);
  const [materialDebugUrl, setMaterialDebugUrl] = useState<string | null>(null);
  const [isLoadingMaterialDebug, setIsLoadingMaterialDebug] = useState(false);

  // Interaction State
  const isPointerDown = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  // Initialize WebGL Engine
  useEffect(() => {
    if (canvasRef.current && !engine) {
      const newEngine = new EpoxyFluidEngine(canvasRef.current);
      if (newEngine.isSupported()) {
        newEngine.setEpoxyMode();
        setEngine(newEngine);
        newEngine.start();
        
        // Initial resize & fill
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          newEngine.resize(clientWidth, clientHeight);
        }
        
        // Fill base after a slight delay to ensure engine is running
        setTimeout(() => {
          newEngine.fillBase(baseColor);
        }, 100);

      } else {
        setWebGLSupported(false);
      }
    }
    
    return () => {
      if (engine) engine.stop();
    };
  }, []); // Run once on mount

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (engine && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        engine.resize(clientWidth, clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [engine]);

  // Phase transition side-effects
  useEffect(() => {
    if (phase === "FINISH" && engine) {
      engine.stop(); // Freeze fluid
    } else if (phase === "MIX" && engine) {
      engine.start(); // Resume fluid
    }
  }, [phase, engine]);

  // Pointer Interaction for WebGL Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "MIX" || !engine) return;
    isPointerDown.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPointerPos.current = { x, y };

    engine.splatPointer(x, y, 0, 0, toolMode === "Pour" ? selectedHighlight : null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown.current || phase !== "MIX" || !engine) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = (x - lastPointerPos.current.x) * 5.0; // amplify velocity
    const dy = (y - lastPointerPos.current.y) * 5.0;
    
    engine.splatPointer(x, y, dx, dy, toolMode === "Pour" ? selectedHighlight : null);
    lastPointerPos.current = { x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDown.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "epoxy-floor-design.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setRoomImage(event.target?.result as string);
        setFinalImage(null);
        setCorners([]);
        setInitialCorners(undefined);
        setDetectionConfidence(null);
        setDetectionStatus(null);
        setDetectionReason(null);
        setNeedsAdjustment(false);
        setFloorMaskUrl(null);
        setFloorMaskFile(null);
        setExcludedObjects([]);
        setActiveExcludedObjects(new Set());
        setVisibleFloorCoverage(null);
        setLightingData(null);
        setShowLightingAnalysis(false);
        setImageDimensions(null);
        setMaskPreviewUrl(null);
        setShowMaskPreview(false);
        setVisualDebugMode(false);
        setIsBrushMode(false);
        setUserMaskBlob(null);
        setValidationError(null);
        setReflectionScore(null);
        setReflectionCoverage(null);
        setShowReflectionDebug(false);
        setReflectionDebugUrl(null);
        setShadowCoverage(null);
        setShadowStrength(null);
        setShowShadowDebug(false);
        setShadowDebugUrl(null);
        setShowMaterialDebug(false);
        setMaterialDebugUrl(null);
        setPhase("DETECT_OPTION");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoDetectFloor = async () => {
    if (!roomImageFile) return;
    setIsDetectingFloor(true);
    setValidationError(null);
    try {
      const formData = new FormData();
      formData.append("image", roomImageFile);
      
      const res = await fetch("http://localhost:8000/analyze-room", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Detection failed");
      const data = await res.json();
      
      if (data.corners && data.corners.length === 4) {
        setInitialCorners(data.corners);
        setDetectionConfidence(data.confidence);
        setDetectionStatus(data.status);
        setDetectionReason(data.reason);
        setNeedsAdjustment(data.needsAdjustment);
        setFloorMaskUrl(data.floorMaskUrl);
        setFloorMaskFile(data.floorMaskFile);
        setExcludedObjects(data.excludedObjects || []);
        
        // Activate all detected objects by default
        const activeSet = new Set<string>();
        (data.excludedObjects || []).forEach((obj: any) => activeSet.add(obj.maskFile));
        setActiveExcludedObjects(activeSet);
        
        setVisibleFloorCoverage(data.visibleFloorCoverage);
        setLightingData(data.lighting || null);
        if (data.imageWidth && data.imageHeight) {
          setImageDimensions({ width: data.imageWidth, height: data.imageHeight });
        }
        setMaskPreviewUrl(data.maskPreviewUrl || data.floorMaskUrl);
        
        setPhase("PREVIEW");
        setShowMaskPreview(true);
        setTimeout(() => setShowMaskPreview(false), 1200);
      } else {
        throw new Error("Invalid corners returned");
      }
    } catch (err: any) {
      setValidationError("Auto detection failed. Please select manually.");
      setInitialCorners(undefined);
      setDetectionConfidence(null);
      setDetectionStatus(null);
      setMaskPreviewUrl(null);
      setPhase("PREVIEW");
    } finally {
      setIsDetectingFloor(false);
    }
  };

  const handleProjectFloor = async () => {
    if (!roomImageFile || !canvasRef.current || corners.length !== 4) return;
    
    setIsProcessing(true);
    setValidationError(null);

    try {
      // 1. Validate corners
      const valForm = new FormData();
      valForm.append("corners", JSON.stringify(corners));
      const valRes = await fetch("http://localhost:8000/validate-floor", {
        method: "POST",
        body: valForm,
      });
      const valData = await valRes.json();
      
      if (!valData.valid) {
        setValidationError(valData.reason || "Invalid floor shape. Please fix corners.");
        setIsProcessing(false);
        return;
      }

      // 2. Generate Texture Blob
      const textureBlob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
      });

      // 3. Assemble API Form
      const applyForm = new FormData();
      applyForm.append("image", roomImageFile);
      applyForm.append("texture", textureBlob, "texture.jpg");
      applyForm.append("corners", JSON.stringify(corners));
      applyForm.append("opacity", opacity.toString());
      applyForm.append("finish", finish);
      
      if (floorMaskFile) {
        applyForm.append("floor_mask_file", floorMaskFile);
      }
      
      const activeObjectFiles = excludedObjects
        .filter(obj => activeExcludedObjects.has(obj.maskFile))
        .map(obj => obj.maskFile);
        
      if (activeObjectFiles.length > 0) {
        applyForm.append("active_object_masks", JSON.stringify(activeObjectFiles));
      }
      
      if (userMaskBlob) {
          applyForm.append("user_mask", userMaskBlob, "user_mask.png");
      }
      
      applyForm.append("preserve_shadows", preserveShadows ? "true" : "false");
      applyForm.append("realism_mode", realismMode);
      applyForm.append("material_depth", materialDepth);
      applyForm.append("metallic_intensity", metallicIntensity.toString());

      const applyRes = await fetch("http://localhost:8000/apply-floor", {
        method: "POST",
        body: applyForm,
      });

      if (!applyRes.ok) {
        const errorText = await applyRes.text();
        throw new Error(`Projection failed: ${errorText}`);
      }

      const score = applyRes.headers.get("X-Reflection-Score");
      const coverage = applyRes.headers.get("X-Reflection-Coverage");
      const shadowScore = applyRes.headers.get("X-Shadow-Score");
      const shadowCov = applyRes.headers.get("X-Shadow-Coverage");
      if (score) setReflectionScore(parseFloat(score));
      if (coverage) setReflectionCoverage(parseFloat(coverage));
      if (shadowScore) setShadowStrength(parseFloat(shadowScore));
      if (shadowCov) setShadowCoverage(parseFloat(shadowCov));

      const blob = await applyRes.blob();
      const objUrl = URL.createObjectURL(blob);
      setFinalImage(objUrl);

    } catch (err: any) {
      setValidationError(err.message || "Network error while connecting to Python backend.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!webGLSupported) {
    return (
      <div className="py-20 text-center text-white bg-slate-900 border-y border-slate-800">
        <h2 className="text-2xl font-bold mb-4">WebGL Not Supported</h2>
        <p className="text-slate-400">Your browser or device does not support WebGL, which is required for the interactive fluid simulation.</p>
      </div>
    );
  }

  // Generate CSS filter based on finish
  const getCanvasFilter = () => {
    if (finish === "HighGloss" || finish === "SemiGloss") return "contrast(1.2) brightness(1.1) saturate(1.1)";
    if (finish === "Satin") return "brightness(1.05) saturate(1.05)";
    return "contrast(0.9) saturate(0.9)"; // Matte
  };

  return (
    <section id="visualizer" className="py-20 bg-slate-900 border-y border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold tracking-widest uppercase rounded-sm mb-4">
            Interactive Visualizer
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Epoxy Floor Designer
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Mix premium epoxy colors with realistic fluid physics to create your custom pattern.
          </p>
        </div>

        {/* Visualizer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel (Left) */}
          <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800/80 p-6 rounded-sm shadow-xl flex flex-col gap-8 text-white z-10">
            
            {/* Phase Indicator */}
            <div className="flex justify-center items-center text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className={phase === "MIX" ? "text-brand-gold" : ""}>1. Mix</span>
              <span className="mx-2 opacity-50">→</span>
              <span className={phase === "FINISH" ? "text-brand-gold" : ""}>2. Finish</span>
              <span className="mx-2 opacity-50">→</span>
              <span className={(phase === "UPLOAD" || phase === "DETECT_OPTION" || phase === "PREVIEW") ? "text-brand-gold" : ""}>3. Project</span>
            </div>

            {phase === "MIX" && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                {/* Base Color */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Base Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {floorColors.base_colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setBaseColor(c.hex)}
                        className={`w-full aspect-square rounded-full border-2 transition-all ${baseColor === c.hex ? "border-brand-gold scale-110" : "border-slate-700 hover:scale-105"}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <button 
                    onClick={() => engine?.fillBase(baseColor)}
                    className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Fill Canvas Base
                  </button>
                </div>

                {/* Highlight Colors */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Highlight Colors</label>
                  <div className="grid grid-cols-6 gap-2">
                    {floorColors.highlight_colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedHighlight(c.hex)}
                        className={`w-full aspect-square rounded-full border-2 transition-all ${selectedHighlight === c.hex ? "border-brand-gold scale-110" : "border-slate-700 hover:scale-105"}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Tool Mode */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Tool</label>
                  <div className="flex bg-slate-900 rounded-sm p-1 border border-slate-800">
                    <button
                      onClick={() => setToolMode("Pour")}
                      className={`flex-1 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-sm transition-all ${toolMode === "Pour" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                    >
                      <Droplets className="w-4 h-4" /> Pour
                    </button>
                    <button
                      onClick={() => setToolMode("Mix")}
                      className={`flex-1 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-sm transition-all ${toolMode === "Mix" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                    >
                      <RefreshCw className="w-4 h-4" /> Swirl & Mix
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => engine?.clear()}
                    className="flex-1 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-sm font-bold text-white rounded-sm transition-colors"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setPhase("FINISH")}
                    className="flex-1 py-3 bg-brand-gold hover:bg-yellow-400 text-sm font-bold text-slate-900 rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Set Epoxy <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {phase === "FINISH" && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Select Finish</label>
                  <div className="flex flex-col gap-2">
                    {(["HighGloss", "SemiGloss", "Satin", "Matte"] as FinishType[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFinish(f)}
                        className={`py-3 px-4 border text-sm font-bold flex justify-between items-center rounded-sm transition-all ${
                          finish === f ? "bg-brand-gold/10 border-brand-gold text-brand-gold" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {f}
                        {finish === f && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setPhase("UPLOAD")}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    See it in your room <ImageIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="w-full py-3 bg-brand-gold hover:bg-yellow-400 text-sm font-bold text-slate-900 rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Download Design <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPhase("MIX")}
                    className="w-full py-3 bg-transparent hover:bg-slate-900 text-sm font-bold text-slate-400 rounded-sm transition-colors"
                  >
                    Back to Mixing
                  </button>
                </div>
              </div>
            )}

            {phase === "UPLOAD" && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Upload Room Photo</h3>
                  <p className="text-xs text-slate-400 mb-4">Upload a clear photo of your floor.</p>
                </div>
                
                <div 
                  className="border-2 border-dashed border-slate-700 hover:border-brand-gold rounded-sm p-8 text-center cursor-pointer transition-colors bg-slate-900/50 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-brand-gold mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-bold text-slate-300 mb-1">Click to upload image</p>
                  <p className="text-xs text-slate-500">JPG, PNG up to 5MB</p>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setPhase("FINISH")}
                    className="w-full py-3 bg-transparent hover:bg-slate-900 text-sm font-bold text-slate-400 rounded-sm transition-colors"
                  >
                    Back to Finish
                  </button>
                </div>
              </div>
            )}

            {phase === "DETECT_OPTION" && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">How to define floor?</h3>
                  <p className="text-xs text-slate-400 mb-4">Let our AI detect the floor automatically, or select it manually.</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleAutoDetectFloor}
                    disabled={isDetectingFloor}
                    className="w-full py-4 bg-brand-gold hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-sm font-bold text-slate-900 rounded-sm transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    {isDetectingFloor ? (
                      <><Loader2 className="w-5 h-5 animate-spin mb-1" /> Detecting Floor using AI...</>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 text-base"><RefreshCw className="w-4 h-4" /> Auto Detect Floor</span>
                        <span className="text-[10px] opacity-70">Powered by SAM2</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                        setInitialCorners(undefined);
                        setDetectionConfidence(null);
                        setPhase("PREVIEW");
                    }}
                    disabled={isDetectingFloor}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Select Manually
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setPhase("UPLOAD")}
                    disabled={isDetectingFloor}
                    className="w-full py-3 bg-transparent hover:bg-slate-900 text-sm font-bold text-slate-400 rounded-sm transition-colors"
                  >
                    Back to Upload
                  </button>
                </div>
              </div>
            )}

            {phase === "PREVIEW" && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Project Texture</h3>
                  <p className="text-xs text-slate-400 mb-4">Adjust the 4 corners to fit your floor area.</p>
                </div>

                {validationError && (
                  <div className="bg-red-900/50 border border-red-500/50 p-3 rounded-sm flex items-start gap-2 text-red-200 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{validationError}</span>
                  </div>
                )}

                {detectionStatus && (
                  <div className={`border p-3 rounded-sm flex items-start gap-2 text-xs mb-4 ${
                    detectionStatus === "excellent" ? "bg-green-900/30 border-green-500/50 text-green-300" :
                    detectionStatus === "good" ? "bg-yellow-900/30 border-yellow-500/50 text-yellow-300" :
                    "bg-red-900/30 border-red-500/50 text-red-300"
                  }`}>
                    {detectionStatus === "excellent" ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-400" /> :
                     detectionStatus === "good" ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" /> :
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />}
                    <div>
                      <span className="font-bold block mb-1">
                        {detectionStatus === "excellent" && "🟢 AI Detection: Excellent"}
                        {detectionStatus === "good" && "🟡 AI Detection: Good"}
                        {(detectionStatus === "review" || detectionStatus === "poor") && "🔴 AI Detection: Low"}
                        {" "}({Math.round(detectionConfidence! * 100)}%)
                      </span>
                      <span>
                        {detectionStatus === "excellent" && "Adjust the corners if needed."}
                        {detectionStatus === "good" && "Please review corners carefully."}
                        {(detectionStatus === "review" || detectionStatus === "poor") && "Manual adjustment strongly recommended."}
                        {detectionReason && <span className="block mt-1 opacity-70 uppercase tracking-wider text-[10px]">Reason: {detectionReason.replace(/_/g, " ")}</span>}
                      </span>
                    </div>
                  </div>
                )}
                

                
                {isBrushMode && (
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setBrushAction('erase')}
                      className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${brushAction === 'erase' ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Erase
                    </button>
                    <button
                      onClick={() => setBrushAction('restore')}
                      className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${brushAction === 'restore' ? 'bg-green-900 text-green-200' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Restore
                    </button>
                  </div>
                )}

                {!finalImage && (
                  <div className="flex flex-col gap-4 border border-slate-800 p-4 rounded-sm bg-slate-900">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Material Properties</h4>
                    
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Realism Mode</label>
                      <div className="flex bg-slate-950 rounded-sm p-1 border border-slate-800">
                        {(["Fast", "Balanced", "Premium"] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setRealismMode(mode)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${realismMode === mode ? "bg-slate-800 text-brand-gold" : "text-slate-400 hover:text-slate-200"}`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Material Depth</label>
                      <div className="flex bg-slate-950 rounded-sm p-1 border border-slate-800">
                        {(["Standard", "Enhanced", "Premium"] as const).map(depth => (
                          <button
                            key={depth}
                            onClick={() => setMaterialDepth(depth)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${materialDepth === depth ? "bg-slate-800 text-brand-gold" : "text-slate-400 hover:text-slate-200"}`}
                          >
                            {depth}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex justify-between text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                        <span>Metallic Intensity</span>
                        <span className="text-brand-gold">{metallicIntensity}%</span>
                      </label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={metallicIntensity} 
                        onChange={(e) => setMetallicIntensity(parseInt(e.target.value))}
                        className="w-full accent-brand-gold"
                      />
                    </div>
                  </div>
                )}

                {!finalImage && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
                      Epoxy Opacity ({opacity}%)
                    </label>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={opacity} 
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-full accent-brand-gold"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold">
                      <span>Subtle</span>
                      <span>Opaque</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                  {!finalImage ? (
                    <button 
                      onClick={handleProjectFloor}
                      disabled={isProcessing || corners.length !== 4}
                      className="w-full py-3 bg-brand-gold hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-sm font-bold text-slate-900 rounded-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : (
                        <><Layers className="w-4 h-4" /> Project Floor</>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const link = document.createElement("a");
                        link.download = "my-room-epoxy.jpg";
                        link.href = finalImage;
                        link.click();
                      }}
                      className="w-full py-3 bg-brand-gold hover:bg-yellow-400 text-sm font-bold text-slate-900 rounded-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download Result
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setRoomImage(null);
                      setFinalImage(null);
                      setPhase("UPLOAD");
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white rounded-sm transition-colors"
                  >
                    Upload Different Image
                  </button>
                  <button 
                    onClick={() => {
                      setFinalImage(null);
                      setPhase("MIX");
                    }}
                    className="w-full py-3 bg-transparent hover:bg-slate-900 text-sm font-bold text-slate-400 rounded-sm transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area (Right) */}
          <div className="lg:col-span-8 bg-black border border-slate-800/80 rounded-sm shadow-2xl relative min-h-[500px] overflow-hidden" ref={containerRef}>
            
            {/* Interactive Fluid Canvas */}
            <canvas
              ref={canvasRef}
              className={`absolute top-0 left-0 w-full h-full touch-none cursor-crosshair transition-opacity duration-300 ${(phase === "UPLOAD" || phase === "DETECT_OPTION" || phase === "PREVIEW") ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ filter: phase === "FINISH" ? getCanvasFilter() : "none" }}
            />

            {/* Uploaded Room Image Preview */}
            {(phase === "UPLOAD" || phase === "DETECT_OPTION" || phase === "PREVIEW") && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 absolute inset-0 z-10">
                {roomImage ? (
                  <div className="relative w-full h-full">
                    {finalImage ? (
                      <img src={finalImage} alt="Final" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        {!isBrushMode ? (
                          <CornerSelector 
                            imageUrl={roomImage} 
                            initialCorners={initialCorners}
                            onCornersChange={setCorners} 
                          />
                        ) : (
                          <MaskBrush 
                            imageUrl={roomImage}
                            brushAction={brushAction}
                            onMaskChange={setUserMaskBlob}
                          />
                        )}
                        
                        {(showMaskPreview || visualDebugMode) && (
                          <div className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center animate-in fade-in duration-200`}>
                             {/* Floor Mask (Green) */}
                             {floorMaskUrl && (
                               <img 
                                 src={floorMaskUrl} 
                                 className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-70" 
                                 style={{ filter: "sepia(100%) hue-rotate(80deg) saturate(300%)" }} 
                                 alt="Floor Mask" 
                               />
                             )}
                             
                             {/* Excluded Objects (Red) */}
                             {visualDebugMode && excludedObjects.filter(o => activeExcludedObjects.has(o.maskFile)).map(obj => (
                               <img 
                                 key={obj.maskFile}
                                 src={obj.maskUrl} 
                                 className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-90" 
                                 style={{ filter: "sepia(100%) hue-rotate(-50deg) saturate(500%)" }} 
                                 alt={`${obj.class} Mask`} 
                               />
                             ))}

                             <div className="absolute top-6 bg-black/90 border border-brand-gold/30 text-brand-gold text-xs px-4 py-2 font-bold uppercase tracking-widest rounded-sm shadow-2xl animate-pulse">
                               {visualDebugMode ? "Visual Debug Mode" : "AI Floor Mask Detected"}
                             </div>
                          </div>
                        )}

                        {showLightingAnalysis && lightingData && imageDimensions && (
                          <div className="absolute inset-0 z-30 pointer-events-none animate-in fade-in duration-200">
                            <svg className="w-full h-full" viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`} preserveAspectRatio="xMidYMid meet">
                              {lightingData.sources.map((s, i) => (
                                <g key={i}>
                                  <circle 
                                    cx={s.x} 
                                    cy={s.y} 
                                    r={s.radius} 
                                    fill="rgba(250, 204, 21, 0.2)" 
                                    stroke="#fbbf24" 
                                    strokeWidth="3" 
                                    className="animate-pulse"
                                  />
                                  <circle 
                                    cx={s.x} 
                                    cy={s.y} 
                                    r={Math.max(3, s.radius * 0.1)} 
                                    fill="#fff" 
                                  />
                                </g>
                              ))}
                            </svg>
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/90 border border-yellow-500/30 text-yellow-400 text-xs px-4 py-2 font-bold uppercase tracking-widest rounded-sm shadow-2xl">
                              Lighting: {lightingData.lightingType} ({(lightingData.ambientBrightness * 100).toFixed(0)}%) | {lightingData.sources.length} sources
                            </div>
                          </div>
                        )}

                        {showReflectionDebug && reflectionDebugUrl && (
                          <img 
                            src={reflectionDebugUrl} 
                            className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none opacity-80" 
                            style={{ mixBlendMode: 'screen' }} 
                            alt="Reflection Map Debug" 
                          />
                        )}

                        {showShadowDebug && shadowDebugUrl && (
                          <img 
                            src={shadowDebugUrl} 
                            className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none" 
                            style={{ mixBlendMode: 'multiply' }} 
                            alt="Shadow Map Debug" 
                          />
                        )}

                        {showMaterialDebug && materialDebugUrl && (
                          <img 
                            src={materialDebugUrl} 
                            className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none" 
                            style={{ mixBlendMode: 'screen' }} 
                            alt="Material Map Debug" 
                          />
                        )}
                      </>
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-gold animate-spin mb-4" />
                        <div className="text-white font-bold tracking-wider uppercase text-sm mb-2 animate-pulse">Running Perspective Warp</div>
                        <div className="text-slate-400 text-xs">Generating your realistic flooring...</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center text-center p-8">
                    <ImageIcon className="w-16 h-16 opacity-20 mb-4" />
                    <p className="font-heading font-bold uppercase tracking-wider">Your Room Here</p>
                    <p className="text-sm mt-2 max-w-md">Upload a photo of your living space to see your custom epoxy design projected onto your actual floor.</p>
                  </div>
                )}
              </div>
            )}

            {/* Hint Overlay */}
            {phase === "MIX" && (
              <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none opacity-50 text-white text-xs font-bold uppercase tracking-wider">
                <span className="bg-black/50 px-3 py-1 rounded-sm">Drag to mix</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
