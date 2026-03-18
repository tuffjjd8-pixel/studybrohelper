import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ZapOff, ImageIcon, Crown, BookOpen, Images, Image as ImageSingle } from "lucide-react";
import { fileToOptimizedDataUrl } from "@/lib/image";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCapturingRef = useRef(false);

  // Camera mode (instant/deep) — persisted in localStorage
  const [cameraMode, setCameraMode] = useState<CameraSolveMode>(() => {
    const saved = localStorage.getItem("camera_solve_mode");
    return saved === "deep" ? "deep" : "instant";
  });

  // Keep mode for session
  const [keepMode, setKeepMode] = useState(() => {
    const saved = sessionStorage.getItem("keep_camera_mode");
    return saved === "true";
  });

  // Deep Mode color panel visibility
  const [showColorPanel, setShowColorPanel] = useState(() => {
    return sessionStorage.getItem("deepColorPanelClosed") !== "true";
  });

  // Deep text color — reads from localStorage (master setting from Profile)
  const [deepTextColor, setDeepTextColor] = useState<DeepModeTextColor>(() => {
    const saved = localStorage.getItem("deep_text_color");
    return (saved as DeepModeTextColor) || "gold";
  });

  // Multi-image toggle
  const [multiImage, setMultiImage] = useState(() => {
    const saved = sessionStorage.getItem("camera_multi_image");
    return saved === "true" && isPremium;
  });

  // Collected images for multi-image mode
  const [collectedImages, setCollectedImages] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem("camera_solve_mode", cameraMode);
    // When switching to instant, hide color panel
    if (cameraMode === "instant") {
      setShowColorPanel(false);
    } else if (cameraMode === "deep") {
      // Show panel if not previously closed
      if (sessionStorage.getItem("deepColorPanelClosed") !== "true") {
        setShowColorPanel(true);
      }
    }
  }, [cameraMode]);

  useEffect(() => {
    sessionStorage.setItem("keep_camera_mode", keepMode ? "true" : "false");
  }, [keepMode]);

  useEffect(() => {
    sessionStorage.setItem("camera_multi_image", multiImage ? "true" : "false");
  }, [multiImage]);

  const handleColorSelect = (color: DeepModeTextColor) => {
    setDeepTextColor(color);
    localStorage.setItem("deep_text_color", color);
  };

  const handleCloseColorPanel = () => {
    setShowColorPanel(false);
    sessionStorage.setItem("deepColorPanelClosed", "true");
  };

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
      setCollectedImages([]);
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

  const finishCapture = useCallback((imageOrImages: string | string[]) => {
    const images = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages];
    stopStream(false);
    onCapture({ images, mode: cameraMode });
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

      if (multiImage && isPremium) {
        const newImages = [...collectedImages, objectUrl];
        if (newImages.length >= 2) {
          finishCapture(newImages);
        } else {
          setCollectedImages(newImages);
          toast.info(`Image ${newImages.length}/2 captured. Take one more!`);
        }
      } else {
        finishCapture(objectUrl);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    } finally {
      isCapturingRef.current = false;
    }
  }, [stopStream, finishCapture, cameraMode, multiImage, isPremium, collectedImages]);

  const handleGalleryPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await fileToOptimizedDataUrl(file, {
        maxDimension: 2048,
        quality: 0.92,
        mimeType: "image/jpeg",
      });

      if (multiImage && isPremium) {
        const newImages = [...collectedImages, optimized];
        if (newImages.length >= 2) {
          finishCapture(newImages);
        } else {
          setCollectedImages(newImages);
          toast.info(`Image ${newImages.length}/2 added. Add one more!`);
        }
      } else {
        finishCapture(optimized);
      }
    } catch (err) {
      console.error("Gallery error:", err);
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        finishCapture(dataUrl);
      } catch {
        console.error("Gallery fallback also failed");
      }
    }
    if (e.target) e.target.value = "";
  }, [finishCapture, multiImage, isPremium, collectedImages]);

  const handleClose = useCallback(() => {
    // Clean up collected blob URLs
    collectedImages.forEach(img => {
      if (img.startsWith("blob:")) URL.revokeObjectURL(img);
    });
    setCollectedImages([]);
    stopStream(true);
    // Reset mode if keepMode is off
    if (!keepMode) {
      setCameraMode("instant");
      setMultiImage(false);
    }
    onClose();
  }, [stopStream, onClose, keepMode, collectedImages]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          onChange={handleGalleryPick}
          className="hidden"
          style={{ position: "absolute", top: -9999, left: -9999, opacity: 0 }}
        />

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

          {/* Deep Mode Color Panel */}
          {cameraMode === "deep" && showColorPanel && isPremium && (
            <div className="absolute top-20 left-4 right-4 z-20">
              <div className="relative">
                <button
                  onClick={handleCloseColorPanel}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center z-10 border border-white/20"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <DeepModeColorPicker
                  selectedColor={deepTextColor}
                  onSelect={handleColorSelect}
                  onClose={handleCloseColorPanel}
                />
              </div>
            </div>
          )}

          {/* Multi-image progress indicator */}
          {multiImage && isPremium && collectedImages.length > 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                <span className="text-white text-sm font-medium">
                  {collectedImages.length}/2 images captured
                </span>
              </div>
            </div>
          )}

          {/* Controls area above bottom */}
          <div className="absolute bottom-36 left-0 right-0 px-5 z-20 space-y-3">
            {/* Multi-Image Toggle */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
                <button
                  onClick={() => setMultiImage(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    !multiImage
                      ? "bg-white/20 text-white"
                      : "text-white/50"
                  }`}
                >
                  <ImageSingle className="w-3 h-3" />
                  Single
                </button>
                <button
                  onClick={() => {
                    if (!isPremium) {
                      toast("Upgrade to Pro for Multi-Image", { icon: "👑" });
                      return;
                    }
                    setMultiImage(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    multiImage && isPremium
                      ? "bg-white/20 text-white"
                      : "text-white/50"
                  }`}
                >
                  <Images className="w-3 h-3" />
                  Multi
                  {!isPremium && <Crown className="w-3 h-3 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Solve Mode Selector */}
            <div className="flex justify-center">
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
                  onClick={() => {
                    if (!isPremium) {
                      toast("Upgrade to Pro to unlock Deep Mode", { icon: "👑" });
                      return;
                    }
                    setCameraMode("deep");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    cameraMode === "deep"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Deep
                  {!isPremium && <Crown className="w-3 h-3 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Keep mode toggle */}
            <div className="flex justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={keepMode}
                  onCheckedChange={setKeepMode}
                  className="scale-75"
                />
                <span className="text-xs text-white/60">Keep this mode for this session</span>
              </label>
            </div>
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
              <div className="absolute inset-0 rounded-full border-[4px] border-white/90" />
              <div
                className={`w-[64px] h-[64px] rounded-full transition-all duration-150 ${
                  isReady
                    ? "bg-white active:bg-white/70 active:scale-90"
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
