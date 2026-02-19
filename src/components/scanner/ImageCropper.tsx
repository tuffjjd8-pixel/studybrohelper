import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "framer-motion";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

function createInitialCrop(mediaWidth: number, mediaHeight: number): Crop {
  // Free-form crop with ~95% coverage so the full image is captured.
  // No forced aspect ratio — adapts to portrait, landscape, or square.
  return centerCrop(
    { unit: "%", width: 95, height: 95, x: 2.5, y: 2.5 },
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    if (width > 0 && height > 0 && naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = createInitialCrop(width, height);
      setCrop(initialCrop);
      const pixelCrop: PixelCrop = {
        unit: "px",
        x: (initialCrop.x / 100) * width,
        y: (initialCrop.y / 100) * height,
        width: (initialCrop.width / 100) * width,
        height: (initialCrop.height / 100) * height,
      };
      setCompletedCrop(pixelCrop);
      setImageLoaded(true);
    }
  }, []);

  const resetCrop = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (width > 0 && height > 0) {
        setCrop(createInitialCrop(width, height));
        setZoom(1);
      }
    }
  }, []);

  // Export: apply zoom + crop to produce the final bitmap
  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || isProcessing) return;

    const image = imgRef.current;
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return;

    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // The CSS zoom scales the image around its center.
      // Convert crop rect from zoomed-display space back to natural-pixel space.
      const displayW = image.width;
      const displayH = image.height;
      const cx = displayW / 2;
      const cy = displayH / 2;

      const cropX = ((completedCrop.x - cx) / zoom + cx) * scaleX;
      const cropY = ((completedCrop.y - cy) / zoom + cy) * scaleY;
      const cropWidth = (completedCrop.width / zoom) * scaleX;
      const cropHeight = (completedCrop.height / zoom) * scaleY;

      // Clamp to natural dimensions
      const srcX = Math.max(0, cropX);
      const srcY = Math.max(0, cropY);
      const srcW = Math.min(cropWidth, image.naturalWidth - srcX);
      const srcH = Math.min(cropHeight, image.naturalHeight - srcY);

      // Max 2048 for performance
      const maxDim = 2048;
      const scale = Math.min(1, maxDim / Math.max(srcW, srcH));

      canvas.width = Math.round(srcW * scale);
      canvas.height = Math.round(srcH * scale);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        srcX, srcY, srcW, srcH,
        0, 0, canvas.width, canvas.height
      );

      // Use JPEG for max compatibility (older Safari, Android WebView, Capacitor)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob creation failed"))),
          "image/jpeg",
          0.92
        );
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        onCropComplete(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Crop error:", error);
      setIsProcessing(false);
    }
  }, [completedCrop, isProcessing, onCropComplete, zoom]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Instructions bar */}
      <div
        className="text-sm text-white/60 text-center py-2 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      >
        Drag corners to adjust • Pinch to zoom
      </div>

      {/* Crop container — fills all remaining space */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          style={{
            "--ReactCrop-crop-border": "2px solid hsl(82 100% 67%)",
            maxWidth: "100%",
            maxHeight: "100%",
          } as React.CSSProperties}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 180px)",
              objectFit: "contain",
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              transition: "transform 0.2s ease",
            }}
            crossOrigin="anonymous"
          />
        </ReactCrop>

        {/* Loading overlay */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="shrink-0 flex flex-col items-center gap-2 py-3 px-4 bg-black/90 border-t border-white/10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="w-9 h-9 rounded-full text-white hover:bg-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white/60 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="w-9 h-9 rounded-full text-white hover:bg-white/10"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isProcessing}
            className="gap-2 rounded-xl border-white/20 text-white bg-white/10 hover:bg-white/20"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetCrop}
            disabled={isProcessing}
            className="gap-2 rounded-xl border-white/20 text-white bg-white/10 hover:bg-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={getCroppedImg}
            disabled={!completedCrop || isProcessing}
            className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-button"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isProcessing ? "Processing..." : "Scan"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
