import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";

interface StreakCounterProps {
  streak: number;
  totalSolves: number;
}

export function StreakCounter({ streak, totalSolves }: StreakCounterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4"
    >
      {/* Streak */}
      <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-full">
        <motion.div
          animate={{ 
            scale: streak > 0 ? [1, 1.2, 1] : 1,
          }}
          transition={{ 
            duration: 0.5, 
            repeat: streak > 0 ? Infinity : 0,
            repeatDelay: 2 
          }}
        >
          <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        </motion.div>
        <span className="font-bold text-foreground">{streak}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">day streak</span>
      </div>

      {/* Total solves */}
      <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-full">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-bold text-foreground">{totalSolves}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">solved</span>
      </div>
    </motion.div>
  );
}
