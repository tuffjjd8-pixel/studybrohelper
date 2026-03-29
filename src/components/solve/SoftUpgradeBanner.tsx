import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface SoftUpgradeBannerProps {
  isPremium: boolean;
  isAuthenticated: boolean;
}

/**
 * Subtle, non-aggressive banner. Shows once per session.
 * No countdown timers, no flashing UI.
 */
export function SoftUpgradeBanner({ isPremium, isAuthenticated }: SoftUpgradeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only show once per session
  useEffect(() => {
    if (sessionStorage.getItem("upgrade_banner_dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (isPremium || !isAuthenticated || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("upgrade_banner_dismissed", "true");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="w-full max-w-md mx-auto"
    >
      <button
        onClick={() => navigate("/premium")}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Limited-time student offer available.
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
        >
          ✕
        </button>
      </button>
    </motion.div>
  );
}
