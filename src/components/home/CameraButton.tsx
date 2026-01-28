import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { fileToOptimizedDataUrl } from "@/lib/image";

interface CameraButtonProps {
  onImageCapture: (imageData: string) => void;
  isLoading?: boolean;
}

export function CameraButton({ onImageCapture, isLoading }: CameraButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const optimized = await fileToOptimizedDataUrl(file, {
      maxDimension: 1280,
      quality: 0.8,
      mimeType: "image/webp",
    });
    onImageCapture(optimized);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150 animate-pulse" />

      {/* Pulsing rings */}
      <AnimatePresence>
        {!isLoading && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          variant="hero"
          size="icon-xl"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`
            relative z-10 w-28 h-28 md:w-32 md:h-32
            ${isDragging ? "ring-4 ring-primary ring-offset-4 ring-offset-background" : ""}
          `}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
              >
                <Loader2 className="w-10 h-10 md:w-12 md:h-12" />
              </motion.div>
            ) : (
              <motion.div
                key="camera"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex flex-col items-center gap-1"
              >
                <Camera className="w-10 h-10 md:w-12 md:h-12" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Label */}
      <motion.p
        className="text-center mt-4 text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {isLoading ? "Solving..." : "Snap Homework"}
      </motion.p>
    </motion.div>
  );
}
