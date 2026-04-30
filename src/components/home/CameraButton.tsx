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
      {/* Outer glow (softened) */}
      <div 
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: "hsl(var(--primary) / 0.12)",
          transform: "scale(1.3)",
        }}
      />

      {/* Pulsing ring animation */}
      {!isLoading && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(var(--primary) / 0.18)" }}
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(var(--primary) / 0.12)" }}
            initial={{ scale: 1, opacity: 0.2 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </>
      )}

      {/* Main button - using Button component with neonGreenFilled variant */}
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant="neonGreenFilled"
        size="icon-xl"
        className="relative z-10 w-28 h-28 md:w-32 md:h-32 transition-all duration-150 ease-out hover:scale-105 hover:shadow-[0_0_22px_hsl(var(--primary)/0.45)] hover:brightness-105"
      >
        {isLoading ? (
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin" />
        ) : (
          <Camera className="w-10 h-10 md:w-12 md:h-12" />
        )}
      </Button>
    </motion.div>
  );
}
