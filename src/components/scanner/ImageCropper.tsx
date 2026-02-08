import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
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
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 85,
      },
      4 / 3,
      mediaWidth,
      mediaHeight
    ),
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    
    // Ensure image has valid dimensions
    if (width > 0 && height > 0 && naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = createInitialCrop(width, height);
      setCrop(initialCrop);
      
      // Immediately set completedCrop for button to work
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

  // Reset crop to default
  const resetCrop = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (width > 0 && height > 0) {
        const initialCrop = createInitialCrop(width, height);
        setCrop(initialCrop);
        setZoom(1);
      }
    }
  }, []);

  // Generate cropped image
  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || isProcessing) return;
    
    const image = imgRef.current;
    
    // Verify image is ready
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      console.error("Image not ready for cropping");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Apply zoom to crop dimensions
      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      // Set canvas size (max 2048 for performance)
      const maxDim = 2048;
      const scale = Math.min(1, maxDim / Math.max(cropWidth, cropHeight));
      
      canvas.width = cropWidth * scale;
      canvas.height = cropHeight * scale;

      // High quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert to blob for better memory management
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob creation failed"))),
          "image/webp",
          0.92
        );
      });

      // Create object URL
      const objectUrl = URL.createObjectURL(blob);
      
      // Convert to data URL for consistency
      const reader = new FileReader();
      reader.onloadend = () => {
        URL.revokeObjectURL(objectUrl);
        onCropComplete(reader.result as string);
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error("Crop error:", error);
      setIsProcessing(false);
    }
  }, [completedCrop, isProcessing, onCropComplete]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full h-full"
    >
      {/* Instructions bar */}
      <div className="text-sm text-muted-foreground text-center py-2 shrink-0">
        Drag corners to adjust • Pinch to zoom
      </div>

      {/* Crop container — fills remaining space */}
      <div 
        ref={containerRef}
        className="relative flex-1 min-h-0 w-full overflow-hidden bg-black"
      >
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          style={{
            "--ReactCrop-crop-border": "2px solid hsl(82 100% 67%)",
            width: "100%",
            height: "100%",
          } as React.CSSProperties}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            className="w-full h-full object-contain"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              transition: "transform 0.2s ease",
            }}
            crossOrigin="anonymous"
          />
        </ReactCrop>
        
        {/* Loading overlay */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 flex flex-col items-center gap-2 py-3 px-4 bg-background border-t border-border">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="w-9 h-9 rounded-full"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="w-9 h-9 rounded-full"
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
            className="gap-2 rounded-xl"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetCrop}
            disabled={isProcessing}
            className="gap-2 rounded-xl"
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
