import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface OneTimeTooltipProps {
  storageKey: string;
  text: string;
  /** Delay before showing in ms */
  delayMs?: number;
  className?: string;
}

/**
 * Lightweight, dismissible, non-blocking tooltip shown only the first time.
 * Caller positions it via `className` (absolute positioning recommended).
 */
export function OneTimeTooltip({ storageKey, text, delayMs = 600, className = "" }: OneTimeTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey) === "1") return;
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [storageKey, delayMs]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  };

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg ${className}`}
        >
          <span>{text}</span>
          <button onClick={dismiss} aria-label="Dismiss" className="opacity-80 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
