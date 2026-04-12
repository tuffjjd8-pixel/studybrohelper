import { motion } from "framer-motion";
import { Lock, Unlock, Zap, Trophy, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface XpTier {
  level: number;
  requiredXP: number;
  price: string;
  label: string;
  motivationText: string;
  icon: React.ReactNode;
}

const TIERS: XpTier[] = [
  {
    level: 1,
    requiredXP: 1000,
    price: "$49.99",
    label: "Dedicated Learner",
    motivationText: "Start solving to unlock ⚡",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    level: 2,
    requiredXP: 5000,
    price: "$44.99",
    label: "Power User",
    motivationText: "You're close — keep solving ⚡",
    icon: <Trophy className="w-4 h-4" />,
  },
  {
    level: 3,
    requiredXP: 15000,
    price: "$39.99",
    label: "Elite Scholar",
    motivationText: "Elite reward — only for top users 🧠",
    icon: <Brain className="w-4 h-4" />,
  },
];

interface XpYearlyTiersProps {
  totalXP: number;
  onSelectTier?: (tier: XpTier) => void;
  disabled?: boolean;
}

export function XpYearlyTiers({ totalXP, onSelectTier, disabled }: XpYearlyTiersProps) {
  const highestUnlockedLevel = TIERS.reduce(
    (max, t) => (totalXP >= t.requiredXP ? t.level : max),
    0
  );

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="text-center space-y-1">
        <h2 className="font-heading font-bold text-lg flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Unlock Better Yearly Deals
        </h2>
        <p className="text-xs text-muted-foreground">
          Earn XP by solving problems • Yearly plan only
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-primary/10 border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">{totalXP.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Tier Ladder */}
      <div className="space-y-3">
        {TIERS.map((tier, index) => {
          const isUnlocked = totalXP >= tier.requiredXP;
          const isHighest = tier.level === highestUnlockedLevel;
          const progress = Math.min((totalXP / tier.requiredXP) * 100, 100);

          return (
            <motion.div
              key={tier.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <motion.button
                onClick={() => isHighest && onSelectTier?.(tier)}
                disabled={disabled || !isHighest}
                whileTap={isHighest ? { scale: 0.98 } : undefined}
                className={`
                  w-full p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden
                  ${isHighest
                    ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                    : isUnlocked
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card/50"
                  }
                  ${!isUnlocked ? "opacity-60" : ""}
                `}
              >
                {/* Glow pulse on highest unlocked */}
                {isHighest && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-primary/40"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <div className="flex items-start gap-3 relative z-10">
                  {/* Lock/Unlock Icon */}
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${
                      isUnlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isUnlocked ? (
                      <Unlock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Tier header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isUnlocked ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          Tier {tier.level}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isUnlocked
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isUnlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                      <span
                        className={`text-lg font-bold ${
                          isUnlocked ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {tier.price}
                        <span className="text-xs font-normal text-muted-foreground">/yr</span>
                      </span>
                    </div>

                    {/* Label */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={isUnlocked ? "text-primary" : "text-muted-foreground"}>
                        {tier.icon}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          isUnlocked ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {tier.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {!isUnlocked && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {totalXP.toLocaleString()} / {tier.requiredXP.toLocaleString()} XP
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {tier.motivationText}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Highest unlocked CTA */}
                    {isHighest && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 text-xs font-medium text-primary"
                      >
                        ✨ Your best deal — tap to select
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* No tiers unlocked */}
      {highestUnlockedLevel === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Solve more problems to earn XP and unlock yearly discounts!
        </p>
      )}
    </div>
  );
}
