import { motion } from "framer-motion";
import { Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ScarcityMessageProps {
  solvesRemaining: number;
  maxSolves: number;
  isPremium: boolean;
  isAuthenticated: boolean;
}

/**
 * Non-blocking, inline scarcity message shown under solve results.
 * Only shows when ≤3 solves remain. Ethical & calm messaging.
 */
export function ScarcityMessage({ solvesRemaining, maxSolves, isPremium, isAuthenticated }: ScarcityMessageProps) {
  const navigate = useNavigate();

  if (isPremium || !isAuthenticated) return null;

  // Only show when ≤3 solves left
  if (solvesRemaining > 3) return null;

  const isLimitReached = solvesRemaining <= 0;

  if (isLimitReached) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3"
      >
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            Daily limit reached
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Upgrade for unlimited solves + Deep Mode explanations.
        </p>
        <Button
          size="sm"
          onClick={() => navigate("/premium")}
          className="gap-1.5 rounded-full"
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade to Pro
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <p className="text-xs text-muted-foreground">
        You have <span className="font-semibold text-foreground">{solvesRemaining}</span> free solve{solvesRemaining !== 1 ? "s" : ""} left today.
      </p>
    </motion.div>
  );
}
