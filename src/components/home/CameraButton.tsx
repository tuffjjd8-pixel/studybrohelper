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

      {/* Main button - TEXT ONLY, NO CAMERA ICON */}
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 px-10 py-5 rounded-full font-heading font-bold text-lg md:text-xl text-primary-foreground bg-primary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        style={{
          boxShadow: "0 0 40px hsl(var(--primary) / 0.4), 0 4px 20px hsl(var(--primary) / 0.3)",
        }}
      >
        {isLoading ? (
          <span className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Solving...
          </span>
        ) : (
          <span>Snap Homework</span>
        )}
      </motion.button>
    </motion.div>
  );
}
