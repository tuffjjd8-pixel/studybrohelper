import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Check,
  X,
  Zap,
  Target,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Calculator,
  Heart,
  Shield,
  Clock,
} from "lucide-react";

interface ComparisonItem {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}

const COMPARISON: ComparisonItem[] = [
  { feature: "Daily Solves", free: "Unlimited", premium: "Unlimited" },
  { feature: "Animated Steps", free: "5/day", premium: "16/day" },
  { feature: "AI Model", free: "Standard", premium: "Advanced" },
  { feature: "Enhanced OCR", free: false, premium: true },
  { feature: "Priority Speed", free: false, premium: true },
  { feature: "Ad-Free Experience", free: false, premium: true },
];

const PREMIUM_BENEFITS = [
  { icon: Sparkles, title: "16 Animated Steps/Day", description: "Detailed step-by-step breakdowns" },
  { icon: Calculator, title: "Premium Calculator", description: "Advanced reasoning & logic" },
  { icon: Target, title: "Enhanced Image Solving", description: "Better OCR accuracy" },
  { icon: Zap, title: "Priority Response", description: "Skip the queue" },
  { icon: Shield, title: "No Ads", description: "Distraction-free learning" },
  { icon: MessageSquare, title: "Latest AI Models", description: "Cutting-edge technology" },
];

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  // Check if user has used trial
  useEffect(() => {
    const trialUsed = localStorage.getItem("premium_trial_used");
    setHasUsedTrial(!!trialUsed);
  }, []);

  // Check if it's Friday (5) or Saturday (6) for weekend discount
  const isWeekendDiscount = useMemo(() => {
    const today = new Date().getDay();
    return today === 5 || today === 6;
  }, []);

  const currentPrice = isWeekendDiscount ? 4.99 : 8.0;
  const regularPrice = 8.0;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("🎉 Premium is already active for everyone!");
    setIsUpgrading(false);
    navigate(user ? "/profile" : "/settings");
  };

  const handleStartTrial = () => {
    localStorage.setItem("premium_trial_used", "true");
    localStorage.setItem("premium_trial_start", new Date().toISOString());
    setHasUsedTrial(true);
    toast.success("🎉 3-Day Free Trial Started! Enjoy premium features.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={false} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Hero */}
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center mx-auto mb-4"
              >
                <Crown className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                Go <span className="text-gradient">Premium</span>
              </h1>
              <p className="text-muted-foreground">
                Unlock the full power of StudyBro AI
              </p>
            </div>

            {/* Free Trial CTA */}
            {!hasUsedTrial && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl border-2 border-secondary bg-secondary/10 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  <span className="font-bold text-lg">Try 3-Day Free Trial</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Experience all premium features for free. No credit card required.
                </p>
                <Button 
                  onClick={handleStartTrial}
                  variant="secondary"
                  className="w-full"
                >
                  Start Free Trial
                </Button>
              </motion.div>
            )}

            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl border-2 border-primary bg-primary/5 relative overflow-hidden"
            >
              {isWeekendDiscount && (
                <div className="absolute top-3 right-3 px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full animate-pulse">
                  🎉 WEEKEND DEAL!
                </div>
              )}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-4xl font-bold">${currentPrice.toFixed(2)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {isWeekendDiscount && (
                  <p className="text-sm text-muted-foreground">
                    <span className="line-through">${regularPrice.toFixed(2)}</span>
                    <span className="text-secondary font-medium ml-2">
                      Save ${(regularPrice - currentPrice).toFixed(2)} this weekend!
                    </span>
                  </p>
                )}
                {!isWeekendDiscount && (
                  <p className="text-sm text-muted-foreground">
                    💡 Come back Friday or Saturday for $4.99!
                  </p>
                )}
              </div>
            </motion.div>

            {/* Gauth-style Comparison Table */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg text-center">Free vs Premium</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-3 bg-muted/50 p-3 font-medium text-sm">
                  <div>Feature</div>
                  <div className="text-center">Free</div>
                  <div className="text-center text-primary">Premium</div>
                </div>
                
                {/* Rows */}
                {COMPARISON.map((item, index) => (
                  <div 
                    key={item.feature}
                    className={`grid grid-cols-3 p-3 text-sm ${
                      index % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                  >
                    <div className="font-medium">{item.feature}</div>
                    <div className="text-center">
                      {typeof item.free === "boolean" ? (
                        item.free ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">{item.free}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof item.premium === "boolean" ? (
                        item.premium ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-primary font-medium">{item.premium}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Benefits */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">Premium Benefits</h2>
              <div className="grid grid-cols-2 gap-3">
                {PREMIUM_BENEFITS.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-card rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <benefit.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{benefit.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="p-4 bg-card rounded-lg border border-border text-center">
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Support Student Development</p>
              <p className="text-xs text-muted-foreground">
                Your subscription helps us build better learning tools
              </p>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky bottom-24 bg-background/95 backdrop-blur-sm pt-4 pb-2"
            >
              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full h-14 text-lg font-bold gap-2"
              >
                {isUpgrading ? (
                  "Processing..."
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Upgrade Now - ${currentPrice.toFixed(2)}/mo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Cancel anytime. No questions asked.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Premium;
