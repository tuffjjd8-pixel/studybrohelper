import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Zap, Brain, Clock, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { openPremiumPage } from "@/lib/mobileDetection";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "solves" | "quizzes";
  currentUsage: number;
  maxUsage: number;
}

export function UpgradeModal({ isOpen, onClose, limitType, currentUsage, maxUsage }: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    openPremiumPage(navigate);
  };

  const title = limitType === "solves" 
    ? "Daily Solve Limit Reached" 
    : "Daily Quiz Limit Reached";

  const description = limitType === "solves"
    ? `You've used all ${maxUsage} daily solves. Upgrade to Pro for unlimited solving power!`
    : `You've used all ${maxUsage} daily quizzes. Upgrade to Pro for unlimited quiz generation!`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-heading font-bold text-center mb-2">
              {title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-center text-sm mb-6">
              {description}
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Infinity className="w-4 h-4 text-primary" />
                </div>
                <span>Unlimited solves & quizzes</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <span>Advanced AI model (70B)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span>Animated step-by-step solutions</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span>Priority response queue</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
              >
                <Crown className="w-4 h-4 mr-2" />
                Go Pro for $5.99/month
              </Button>
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="w-full text-muted-foreground"
              >
                Maybe later
              </Button>
            </div>

            {/* Reset notice */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Daily limits reset at midnight UTC
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
