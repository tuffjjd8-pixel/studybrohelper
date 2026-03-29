import { useRef, useState, useCallback, useEffect } from "react";
import { Upload } from "lucide-react";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface ScannerDropZoneProps {
  onImageSelect: (imageData: string) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
}

export function ScannerDropZone({ onImageSelect, onOpenCamera, isLoading }: ScannerDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const optimized = await fileToOptimizedDataUrl(file, {
        maxDimension: 2048,
        quality: 0.92,
        mimeType: "image/webp",
      });
      onImageSelect(optimized);
    } catch (error) {
      console.error("Image processing error:", error);
    }
  }, [onImageSelect]);

  // Process blob URL (from camera)
  const processBlobUrl = useCallback(async (blobUrl: string) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], "camera-capture.webp", { type: blob.type });
      await processFile(file);
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Blob processing error:", error);
    }
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  }, [processFile]);

  // Paste event listener
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Expose processBlobUrl for camera captures
  useEffect(() => {
    (window as unknown as { processCameraCapture?: (url: string) => void }).processCameraCapture = processBlobUrl;
    return () => {
      delete (window as unknown as { processCameraCapture?: (url: string) => void }).processCameraCapture;
    };
  }, [processBlobUrl]);

  const handleZoneClick = () => {
    // On mobile, try camera first, fallback to file picker
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      onOpenCamera();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Hidden file input - NO capture attribute for Cricket device compatibility */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop zone card with neon glow */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleZoneClick}
        className={`
          relative flex flex-col items-center justify-center gap-6 p-10 rounded-3xl
          border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-primary/40 hover:border-primary/70 bg-card/50 hover:bg-card/70"
          }
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        style={{
          boxShadow: isDragging 
            ? "0 0 40px hsl(var(--primary) / 0.4), inset 0 0 20px hsl(var(--primary) / 0.1)"
            : "0 0 30px hsl(var(--primary) / 0.15), inset 0 0 10px hsl(var(--primary) / 0.05)",
        }}
      >
        {/* Neon corner highlights */}
        <div className="absolute top-3 left-3 w-8 h-8 border-l-3 border-t-3 border-primary rounded-tl-xl" 
          style={{ borderWidth: "3px" }} />
        <div className="absolute top-3 right-3 w-8 h-8 border-r-3 border-t-3 border-primary rounded-tr-xl"
          style={{ borderWidth: "3px" }} />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-l-3 border-b-3 border-primary rounded-bl-xl"
          style={{ borderWidth: "3px" }} />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-r-3 border-b-3 border-primary rounded-br-xl"
          style={{ borderWidth: "3px" }} />

        {/* Upload icon with animation */}
        <motion.div
          animate={{ 
            scale: isDragging ? 1.15 : 1,
            y: isDragging ? -5 : 0,
          }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center"
          style={{
            boxShadow: "0 0 25px hsl(var(--primary) / 0.3)",
          }}
        >
          <Upload className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="font-heading font-semibold text-lg text-foreground">
            Drop homework image here
          </p>
          <p className="text-sm text-muted-foreground">
            Tap to take photo • Paste from clipboard
          </p>
        </div>

        {/* Gallery button for mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors border border-primary/30"
        >
          <Upload className="w-4 h-4" />
          Choose from Gallery
        </button>
      </div>
    </motion.div>
  );
}
