import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ScannerLoadingStateProps {
  image?: string;
  // kept for backwards-compat with existing callers; intentionally unused
  stage?: "extracting" | "classifying" | "solving";
}

const ROTATING_STATUS = [
  "reading problem...",
  "figuring it out...",
  "almost there...",
];

export function ScannerLoadingState({ image }: ScannerLoadingStateProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % ROTATING_STATUS.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-center gap-7 py-10 w-full max-w-md mx-auto"
    >
      {/* Image preview with subtle shimmer */}
      {image && (
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative rounded-2xl overflow-hidden border border-primary/20"
          style={{
            boxShadow: "0 0 40px hsl(var(--primary) / 0.18)",
          }}
        >
          <img
            src={image}
            alt="Analyzing"
            className="max-h-44 object-contain"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.18) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.8s infinite",
            }}
          />
        </motion.div>
      )}

      {/* Spinner with neon glow */}
      <div className="relative flex items-center justify-center">
        {/* Soft outer halo */}
        <div
          className="absolute w-20 h-20 rounded-full blur-2xl opacity-60"
          style={{ background: "hsl(var(--primary) / 0.35)" }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="relative w-14 h-14 rounded-full border-[3px] border-muted/40 border-t-primary"
          style={{
            boxShadow:
              "0 0 18px hsl(var(--primary) / 0.55), 0 0 36px hsl(var(--primary) / 0.25)",
          }}
        />
      </div>

      {/* Headline + rotating subtle status */}
      <div className="text-center space-y-2 min-h-[3.5rem]">
        <p className="font-heading font-semibold text-xl text-foreground tracking-tight">
          Analyzing
          <span className="inline-block ml-0.5">
            <DotsAnimation />
          </span>
        </p>
        <div className="h-5 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-sm text-muted-foreground absolute inset-0"
            >
              {ROTATING_STATUS[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function DotsAnimation() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
