import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface CameraButtonProps {
  onImageCapture?: (imageData: string) => void;
  isLoading?: boolean;
}

export function CameraButton({ isLoading }: CameraButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isLoading) return;
    // Always navigate to the web scanner page - never open native camera
    navigate("/scanner");
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

      {/* Main button - CIRCULAR, TEXT ONLY, NO CAMERA ICON */}
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 w-36 h-36 md:w-40 md:h-40 rounded-full font-heading font-bold text-base md:text-lg text-primary-foreground bg-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-center leading-tight"
        style={{
          boxShadow: "0 0 50px hsl(var(--primary) / 0.5), 0 0 100px hsl(var(--primary) / 0.3), 0 4px 20px hsl(var(--primary) / 0.4)",
        }}
      >
        {isLoading ? (
          <span className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Solving...</span>
          </span>
        ) : (
          <span className="px-2">Snap<br />Homework</span>
        )}
      </motion.button>
    </motion.div>
  );
}
