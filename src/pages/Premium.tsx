import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Check,
  Zap,
  Shield,
  Target,
  MessageSquare,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

const PREMIUM_FEATURES = [
  {
    icon: Target,
    title: "99% Accuracy",
    description: "Most accurate AI-powered solutions",
  },
  {
    icon: Zap,
    title: "Priority AI Responses",
    description: "Faster processing and shorter wait times",
  },
  {
    icon: MessageSquare,
    title: "Advanced Explanations",
    description: "Detailed step-by-step problem breakdowns",
  },
  {
    icon: Shield,
    title: "Unlimited Solves",
    description: "No daily limits, solve as much as you want",
  },
  {
    icon: Sparkles,
    title: "Ad-Free Experience",
    description: "Focus on learning without distractions",
  },
  {
    icon: Crown,
    title: "Support Development",
    description: "Help us build more amazing features",
  },
];

const Premium = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      navigate("/auth");
      return;
    }

    setIsUpgrading(true);

    try {
      // Update user's premium status
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("🎉 Welcome to Premium, Bro! You're all set!");
      navigate("/profile");
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to upgrade. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
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

            {/* Plan selection */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlan("monthly")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedPlan === "monthly"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="text-lg font-bold">$4.99</div>
                <div className="text-xs text-muted-foreground">per month</div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlan("yearly")}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  selectedPlan === "yearly"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="absolute -top-2 right-2 px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full">
                  SAVE 35%
                </div>
                <div className="text-lg font-bold">$39</div>
                <div className="text-xs text-muted-foreground">per year</div>
              </motion.button>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              {PREMIUM_FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Check className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
                </motion.div>
              ))}
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
                    Upgrade Now - {selectedPlan === "monthly" ? "$4.99/mo" : "$39/year"}
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
