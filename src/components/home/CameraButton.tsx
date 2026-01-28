import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraButtonProps {
  onImageCapture?: (imageData: string) => void;
  isLoading?: boolean;
  onClick?: () => void;
}

export function CameraButton({ isLoading, onClick }: CameraButtonProps) {
  const handleClick = () => {
    if (isLoading) return;
    onClick?.();
  };

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: "hsl(var(--primary) / 0.25)",
          transform: "scale(1.5)",
        }}
      />

      {/* Pulsing ring animation */}
      {!isLoading && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(var(--primary) / 0.3)" }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(var(--primary) / 0.2)" }}
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </>
      )}

      {/* Main button - using Button component with neonGreenFilled variant */}
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant="neonGreenFilled"
        size="icon-xl"
        className="relative z-10 font-heading font-bold text-sm leading-tight"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Camera className="w-8 h-8" />
        )}
      </Button>
    </motion.div>
  );
}
