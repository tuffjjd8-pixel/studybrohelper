import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, X, Crown } from "lucide-react";

interface FinalChallengeCardProps {
  topic: string;
  isPremium: boolean;
  onStart: () => void;
  onLater: () => void;
  visible: boolean;
}

/**
 * Non-intrusive slide-up card encouraging the user to take a Final Challenge
 * on the topic they've been actively practicing.
 */
export function FinalChallengeCard({ topic, isPremium, onStart, onLater, visible }: FinalChallengeCardProps) {
  const questionCount = isPremium ? 10 : 5;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="relative bg-gradient-to-br from-primary/15 via-card to-card border-2 border-primary/40 rounded-2xl p-5 mb-6 shadow-[0_0_30px_hsl(var(--primary)/0.15)] overflow-hidden"
        >
          {/* Subtle glow accents */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={onLater}
            aria-label="Dismiss"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/40"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-heading font-bold">Final Challenge</h3>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">
                  <Sparkles className="w-3 h-3" />
                  Mastery
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                You've been practicing <span className="text-foreground font-semibold">{topic}</span> — ready to test your mastery?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {questionCount} mixed-difficulty questions
                {!isPremium && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-primary/80">
                    <Crown className="w-3 h-3" />
                    Pro unlocks 10
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onStart} variant="neonGreenFilled" size="sm" className="flex-1">
              Start Challenge
            </Button>
            <Button onClick={onLater} variant="outline" size="sm" className="flex-1">
              Later
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
