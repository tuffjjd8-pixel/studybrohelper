import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Crown, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface UsageCounterProps {
  label: string;
  used: number;
  max: number;
  isPremium: boolean;
  showUpgradeHint?: boolean;
}

export function UsageCounter({ label, used, max, isPremium, showUpgradeHint = true }: UsageCounterProps) {
  const remaining = Math.max(0, max - used);
  const usagePercent = (used / max) * 100;
  const isAtLimit = remaining === 0;
  const isNearLimit = remaining <= Math.ceil(max * 0.2) && !isAtLimit;

  if (isPremium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-primary/20 rounded-lg p-3 flex items-center gap-2"
      >
        <Crown className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {label}: <span className="text-foreground font-medium">Unlimited</span>
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-lg p-3 ${
        isAtLimit ? "border-destructive/50" : isNearLimit ? "border-yellow-500/50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm ${isAtLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {used}/{max}
        </span>
      </div>
      <Progress 
        value={usagePercent} 
        className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`}
      />
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs ${isAtLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {remaining} remaining
        </span>
        <span className="text-xs text-muted-foreground">Resets at midnight</span>
      </div>
      
      {isAtLimit && showUpgradeHint && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
          <span className="text-xs text-destructive">
            Limit reached. <Link to="/premium" className="underline">Upgrade for more</Link>
          </span>
        </div>
      )}
    </motion.div>
  );
}
