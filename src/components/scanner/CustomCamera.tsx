import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ZapOff, ImageIcon } from "lucide-react";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface CustomCameraProps {
  isOpen: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CustomCamera({ isOpen, onCapture, onClose }: CustomCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    stopStream();

    try {
      // Request maximum resolution, full sensor FOV, rear camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeout = setTimeout(() => reject(new Error("Video timeout")), 10000);

          const checkReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              resolve();
            }
          };

          video.onloadedmetadata = () => {
            video.play().then(checkReady).catch(reject);
          };

          if (video.readyState >= 2) {
            video.play().then(checkReady).catch(reject);
          }
        });

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(capabilities?.torch === true);

        setIsReady(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : "Could not access camera. Please use gallery instead."
      );
    }
  }, [stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
      setTorchEnabled(false);
    }
    return () => stopStream();
  }, [isOpen, startCamera, stopStream]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet],
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Torch toggle failed:", err);
    }
  }, [torchEnabled, torchSupported]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady || isCapturing) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Video not ready");
      }

      // Full resolution capture — no cropping
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
      stopStream();
      onCapture(objectUrl);
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing, stopStream, onCapture]);

  const handleGalleryPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await fileToOptimizedDataUrl(file, {
        maxDimension: 2048,
        quality: 0.92,
        mimeType: "image/webp",
      });
      stopStream();
      onCapture(optimized);
    } catch (err) {
      console.error("Gallery error:", err);
    }
    if (e.target) e.target.value = "";
  }, [stopStream, onCapture]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  if (!isOpen) return null;

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
          accept="image/*"
          onChange={handleGalleryPick}
          className="hidden"
        />

        {/* Full-screen edge-to-edge camera feed */}
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
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
              disabled={!isReady || isCapturing}
              className="relative w-[76px] h-[76px] flex items-center justify-center"
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-[4px] border-white/90" />
              {/* Inner button */}
              <div
                className={`w-[64px] h-[64px] rounded-full transition-all duration-150 ${
                  isReady && !isCapturing
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
