import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraButtonProps {
  isLoading?: boolean;
  onClick: () => void; // this triggers your scanner overlay
}

export function CameraButton({ isLoading, onClick }: CameraButtonProps) {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {/* Outer neon glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: "hsl(var(--primary) / 0.25)",
          transform: "scale(1.5)",
        }}
      />

      {/* Pulsing rings (Gauth style) */}
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
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
        </>
      )}

      {/* MAIN BUTTON — perfect circle, neon green, Gauth style */}
      <Button
        onClick={onClick}
        disabled={isLoading}
        variant="neonGreenFilled"
        size="icon-xl"
        className="relative z-10 font-heading font-bold text-sm leading-tight text-black"
      >
        {isLoading ? (
          <span className="flex flex-col items-center gap-1">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Solving...</span>
          </span>
        ) : (
          <span className="text-center px-1">
            Snap
            <br />
            Homework
          </span>
        )}
      </Button>
    </motion.div>
  );
}
