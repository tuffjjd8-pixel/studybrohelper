import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ZapOff, ImageIcon, Crown, BookOpen, Images, Image as ImageSingle, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fileToOptimizedDataUrl } from "@/lib/image";

export type CameraSolveMode = "instant" | "deep";

export interface CameraCaptureResult {
  images: string[];
  mode: CameraSolveMode;
}

interface CustomCameraProps {
  isOpen: boolean;
  onCapture: (result: CameraCaptureResult) => void;
  onClose: () => void;
  isPremium?: boolean;
}

// Module-level stream cache so reopening doesn't reinitialize the sensor
let cachedStream: MediaStream | null = null;

export function CustomCamera({ isOpen, onCapture, onClose, isPremium = false }: CustomCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use refs for perf-sensitive state to avoid layout thrashing
  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCapturingRef = useRef(false);

  // Keep mode: persists selections within session
  const [keepMode, setKeepMode] = useState(() => {
    return sessionStorage.getItem("camera_keep_mode") === "true";
  });

  const [cameraMode, setCameraMode] = useState<CameraSolveMode>(() => {
    const saved = localStorage.getItem("camera_solve_mode");
    return saved === "deep" ? "deep" : "instant";
  });

  const [multiImageEnabled, setMultiImageEnabled] = useState(() => {
    if (!isPremium) return false;
    const saved = localStorage.getItem("camera_multi_image");
    return saved === "true";
  });

  // Multi-image capture state
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem("camera_solve_mode", cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    localStorage.setItem("camera_multi_image", multiImageEnabled ? "true" : "false");
  }, [multiImageEnabled]);

  useEffect(() => {
    sessionStorage.setItem("camera_keep_mode", keepMode ? "true" : "false");
  }, [keepMode]);

  // Reset multi-image if not premium
  useEffect(() => {
    if (!isPremium) setMultiImageEnabled(false);
  }, [isPremium]);

  const stopStream = useCallback((releaseCache = false) => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (releaseCache && cachedStream) {
      cachedStream.getTracks().forEach((track) => track.stop());
      cachedStream = null;
    }
    isReadyRef.current = false;
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    isReadyRef.current = false;
    setIsReady(false);

    try {
      let stream = cachedStream;
      if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
        if (cachedStream) {
          cachedStream.getTracks().forEach((t) => t.stop());
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
        cachedStream = stream;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});

        const onFrame = () => {
          const v = videoRef.current;
          if (v && v.videoWidth > 0 && v.videoHeight > 0) {
            isReadyRef.current = true;
            setIsReady(true);
            const track = stream!.getVideoTracks()[0];
            const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
            setTorchSupported(caps?.torch === true);
          } else {
            requestAnimationFrame(onFrame);
          }
        };
        requestAnimationFrame(onFrame);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : "Could not access camera. Please use gallery instead."
      );
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      // Reset captured images when opening
      setCapturedImages([]);
    } else {
      stopStream(false);
      setTorchEnabled(false);
    }
    return () => stopStream(true);
  }, [isOpen, startCamera, stopStream]);

  const toggleTorch = useCallback(async () => {
    if (!cachedStream || !torchSupported) return;
    const track = cachedStream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet],
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Torch toggle failed:", err);
    }
  }, [torchEnabled, torchSupported]);

  const finalizeCapture = useCallback((allImages: string[]) => {
    stopStream(false);
    onCapture({ images: allImages, mode: cameraMode });
    setCapturedImages([]);
  }, [stopStream, onCapture, cameraMode]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReadyRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Video not ready");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob creation failed"))),
          "image/webp",
          0.92
        );
      });

      const objectUrl = URL.createObjectURL(blob);

      if (multiImageEnabled && capturedImages.length === 0) {
        // First image in multi-image mode — keep camera open for second
        setCapturedImages([objectUrl]);
      } else if (multiImageEnabled && capturedImages.length === 1) {
        // Second image — finalize
        finalizeCapture([...capturedImages, objectUrl]);
      } else {
        // Single image mode
        finalizeCapture([objectUrl]);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    } finally {
      isCapturingRef.current = false;
    }
  }, [stopStream, onCapture, cameraMode, multiImageEnabled, capturedImages, finalizeCapture]);

  const handleGalleryPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const maxFiles = multiImageEnabled ? 2 : 1;
      const selectedFiles = Array.from(files).slice(0, maxFiles);
      
      const processedImages = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await fileToOptimizedDataUrl(file, {
              maxDimension: 2048,
              quality: 0.92,
              mimeType: "image/jpeg",
            });
          } catch {
            // Fallback: raw file as data URL
            const reader = new FileReader();
            return new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
        })
      );

      finalizeCapture(processedImages);
    } catch (err) {
      console.error("Gallery error:", err);
    }
    if (e.target) e.target.value = "";
  }, [finalizeCapture, multiImageEnabled]);

  const handleClose = useCallback(() => {
    // Clean up any captured images
    capturedImages.forEach((img) => {
      if (img.startsWith("blob:")) URL.revokeObjectURL(img);
    });
    setCapturedImages([]);

    // If keep mode is off, reset to defaults
    if (!keepMode) {
      setCameraMode("instant");
      setMultiImageEnabled(false);
    }

    stopStream(true);
    onClose();
  }, [stopStream, onClose, keepMode, capturedImages]);

  const handleDoneMultiImage = useCallback(() => {
    if (capturedImages.length > 0) {
      finalizeCapture(capturedImages);
    }
  }, [capturedImages, finalizeCapture]);

  if (!isOpen) return null;

  const isMultiCapturing = multiImageEnabled && capturedImages.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
        {/* Hidden file input for gallery */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          onChange={handleGalleryPick}
          className="hidden"
          multiple={multiImageEnabled}
          style={{ position: "absolute", top: -9999, left: -9999, opacity: 0 }}
        />

        {/* Full-screen edge-to-edge camera feed */}
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover" }}
          />

          {/* Loading spinner */}
          {!isReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-white/60">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
              <div className="text-center space-y-4">
                <p className="text-red-400 font-medium">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2 rounded-full bg-white/10 text-white text-sm border border-white/20"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Top bar — close + flash */}
          <div
            className="absolute top-0 left-0 right-0 flex justify-between items-center px-5 z-10"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 12px) + 12px)" }}
          >
            <button
              onClick={handleClose}
              className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center ${
                  torchEnabled ? "bg-primary/40" : "bg-black/40"
                }`}
              >
                {torchEnabled ? (
                  <Zap className="w-5 h-5 text-primary" />
                ) : (
                  <ZapOff className="w-5 h-5 text-white/70" />
                )}
              </button>
            )}
          </div>

          {/* Multi-image captured thumbnail */}
          {isMultiCapturing && (
            <div className="absolute top-20 left-0 right-0 px-5 z-20 flex justify-center">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <img
                  src={capturedImages[0]}
                  alt="Captured 1"
                  className="w-16 h-16 rounded-lg object-cover border-2 border-primary/60"
                />
                <div className="text-white text-sm">
                  <p className="font-medium">1/2 captured</p>
                  <p className="text-white/60 text-xs">Take second photo</p>
                </div>
                <button
                  onClick={handleDoneMultiImage}
                  className="ml-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                >
                  Done (1)
                </button>
              </div>
            </div>
          )}

          {/* Solve Mode + Multi-Image Selectors — above bottom controls */}
          <div className="absolute bottom-36 left-0 right-0 px-5 z-20 flex flex-col items-center gap-2">
            {/* Solve Mode Selector */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
              <button
                onClick={() => setCameraMode("instant")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  cameraMode === "instant"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Instant
              </button>
              <button
                onClick={() => setCameraMode("deep")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  cameraMode === "deep"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Deep
                <Crown className="w-3 h-3 text-amber-400" />
              </button>
            </div>

            {/* Multi-Image Toggle (Pro only) */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
              <button
                onClick={() => setMultiImageEnabled(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  !multiImageEnabled
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                <ImageSingle className="w-3 h-3" />
                Single
              </button>
              <button
                onClick={() => {
                  if (!isPremium) {
                    // Could show toast but we keep it simple with visual lock
                    return;
                  }
                  setMultiImageEnabled(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  multiImageEnabled
                    ? "bg-white/20 text-white shadow-lg"
                    : isPremium
                    ? "text-white/50 hover:text-white/70"
                    : "text-white/30 cursor-not-allowed"
                }`}
              >
                <Images className="w-3 h-3" />
                Multi (2)
                {!isPremium && <Crown className="w-3 h-3 text-amber-400" />}
              </button>
            </div>

            {/* Keep this mode checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={keepMode}
                onCheckedChange={(checked) => setKeepMode(checked === true)}
                className="border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs text-white/60">Keep this mode for this session</span>
            </label>
          </div>

          {/* Bottom controls */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-10 z-10"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 28px)" }}
          >
            {/* Gallery button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20"
            >
              <ImageIcon className="w-5 h-5 text-white/80" />
            </button>

            {/* Shutter button */}
            <button
              onClick={capturePhoto}
              disabled={!isReady}
              className="relative w-[76px] h-[76px] flex items-center justify-center"
            >
              {/* Outer ring */}
              <div className={`absolute inset-0 rounded-full border-[4px] ${isMultiCapturing ? "border-primary/90" : "border-white/90"}`} />
              {/* Inner button */}
              <div
                className={`w-[64px] h-[64px] rounded-full transition-all duration-150 ${
                  isReady
                    ? isMultiCapturing
                      ? "bg-primary active:bg-primary/70 active:scale-90"
                      : "bg-white active:bg-white/70 active:scale-90"
                    : "bg-white/30"
                }`}
              />
            </button>

            {/* Spacer for symmetry */}
            <div className="w-12 h-12" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
