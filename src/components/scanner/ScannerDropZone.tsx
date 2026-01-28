import { useRef, useState, useCallback } from "react";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface ScannerDropZoneProps {
  onImageSelect: (imageData: string) => void;
  isLoading?: boolean;
}

export function ScannerDropZone({ onImageSelect, isLoading }: ScannerDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const optimized = await fileToOptimizedDataUrl(file, {
      maxDimension: 1920,
      quality: 0.9,
      mimeType: "image/webp",
    });
    onImageSelect(optimized);
  }, [onImageSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
        if (file) processFile(file);
        break;
      }
    }
  }, [processFile]);

  // Listen for paste events
  useState(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl
          border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-primary/40 hover:border-primary/70 bg-card/50 hover:bg-card/70"
          }
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Animated corner accents */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary rounded-tl-lg" />
        <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary rounded-br-lg" />

        <motion.div
          animate={{ 
            scale: isDragging ? 1.1 : 1,
            rotate: isDragging ? 5 : 0 
          }}
          className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center"
        >
          <ImageIcon className="w-8 h-8 text-primary" />
        </motion.div>

        <div className="text-center">
          <p className="font-medium text-foreground mb-1">
            Drop homework image here
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse • paste from clipboard
          </p>
        </div>

        {/* Camera button for mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </button>
      </div>
    </motion.div>
  );
}
