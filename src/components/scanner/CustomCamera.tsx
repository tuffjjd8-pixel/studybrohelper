import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Zap, ZapOff, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomCameraProps {
  isOpen: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CustomCamera({ isOpen, onCapture, onClose }: CustomCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    stopStream();

    try {
      // Request camera with constraints - avoid capture attribute issues
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready with dimensions > 0
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
          
          // Also check if already loaded
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
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
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

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Video not ready");
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");
      
      // Flip horizontally if front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob for better memory handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob creation failed"))),
          "image/webp",
          0.9
        );
      });
      
      const objectUrl = URL.createObjectURL(blob);
      
      // Stop camera before callback
      stopStream();
      onCapture(objectUrl);
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing, facingMode, stopStream, onCapture]);

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
        className="fixed inset-0 z-50 bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Video preview */}
        <div className="relative h-full w-full flex flex-col">
          {/* Camera feed */}
          <div className="flex-1 relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />
            
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[85%] max-w-md aspect-[4/3]">
                {/* Corner highlights */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-xl" />
                
                {/* Neon glow effect */}
                <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_hsl(var(--primary)/0.3)]" />
                
                {/* Grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-primary/20" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Loading state */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Starting camera...</p>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6">
                <div className="text-center space-y-4">
                  <p className="text-destructive font-medium">{error}</p>
                  <Button variant="outline" onClick={startCamera}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Top controls */}
          <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGrid(!showGrid)}
                className={`w-10 h-10 rounded-full backdrop-blur-sm ${
                  showGrid ? "bg-primary/30" : "bg-background/50"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </Button>
              
              {torchSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTorch}
                  className={`w-10 h-10 rounded-full backdrop-blur-sm ${
                    torchEnabled ? "bg-primary/30" : "bg-background/50"
                  }`}
                >
                  {torchEnabled ? <Zap className="w-5 h-5 text-primary" /> : <ZapOff className="w-5 h-5" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={flipCamera}
                className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Bottom controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
            <button
              onClick={capturePhoto}
              disabled={!isReady || isCapturing}
              className={`
                relative w-20 h-20 rounded-full transition-all duration-200
                ${isReady && !isCapturing 
                  ? "bg-primary shadow-neon active:scale-95" 
                  : "bg-muted opacity-50"
                }
              `}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-primary/50" />
              {/* Inner circle */}
              <div className="absolute inset-2 rounded-full bg-primary" />
              {/* Glow pulse when ready */}
              {isReady && !isCapturing && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-primary/30" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
