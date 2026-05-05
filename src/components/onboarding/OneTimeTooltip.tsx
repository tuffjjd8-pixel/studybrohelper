import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  storageKey: string;
  text: string;
  /** Delay before showing (ms) */
  delay?: number;
  /** Auto-dismiss after (ms). Default 6000. */
  autoDismiss?: number;
  /** Position relative to parent. Parent must be relative. */
  position?: "top" | "bottom";
  className?: string;
  /** Only render when this is true (e.g., element is visible). */
  active?: boolean;
}

export function OneTimeTooltip({
  storageKey,
  text,
  delay = 600,
  autoDismiss = 6000,
  position = "bottom",
  className = "",
  active = true,
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [storageKey, delay, active]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => dismiss(), autoDismiss);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, autoDismiss]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setShow(false);
  };

  const posClass =
    position === "top"
      ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
      : "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? 6 : -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className={`absolute z-50 pointer-events-auto ${posClass} ${className}`}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{
              background: "hsl(var(--background))",
              border: "1.5px solid hsl(var(--primary))",
              color: "hsl(var(--primary))",
              boxShadow: "0 0 20px hsl(var(--primary) / 0.35)",
            }}
          >
            <span>{text}</span>
            <button
              onClick={dismiss}
              className="opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
