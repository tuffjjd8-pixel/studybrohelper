import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Loader2, Star, Sparkles } from "lucide-react";
import { isMobileApp } from "@/lib/mobileDetection";

type CommunityPlan = "monthly" | "lifetime";

const CommunityGoalReward = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<CommunityPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [goalVisible, setGoalVisible] = useState<boolean | null>(null);

  // Check if community goal is completed (visible)
  useEffect(() => {
    const checkGoal = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("visible")
        .limit(1)
        .single();
      setGoalVisible(data?.visible ?? false);
    };
    checkGoal();
  }, []);

  // If goal not completed, redirect away
  useEffect(() => {
    if (goalVisible === false) {
      toast.error("Community goal not yet reached");
      navigate("/");
    }
  }, [goalVisible, navigate]);

  const handleCheckout = async (plan: CommunityPlan) => {
    if (isMobileApp()) {
      toast.error("Please complete your purchase on our website");
      return;
    }

    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    setSelectedPlan(plan);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("createCheckoutSession", {
        body: { userId: user.id, plan: plan === "monthly" ? "weekend" : "lifetime" },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to create checkout session. Please try again.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL received. Please try again.");
      }
    } catch (err) {
      console.error("Checkout exception:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  if (goalVisible === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={false} />

      <main className="pt-20 pb-32 px-4">
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
                className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
              >
                <Star className="w-10 h-10 text-black" />
              </motion.div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                Community Goal <span className="text-gradient">Reward</span>
              </h1>
              <p className="text-muted-foreground">
                Thanks for helping us reach the milestone!
              </p>
            </div>

            {/* Plan Cards */}
            <div className="space-y-4">
              {/* Monthly Plan */}
              <motion.button
                onClick={() => handleCheckout("monthly")}
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">$4.99</span>
                      <span className="text-muted-foreground text-sm">/ month</span>
                    </div>
                    <div className="font-medium mt-1">Community Goal Monthly</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Only $0.17 per day
                    </div>
                  </div>
                  {isLoading && selectedPlan === "monthly" ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <Crown className="w-6 h-6 text-primary" />
                  )}
                </div>
              </motion.button>

              {/* Lifetime Plan — Premium gold style */}
              <motion.button
                onClick={() => handleCheckout("lifetime")}
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full p-5 rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-card via-card to-yellow-500/5 hover:border-yellow-400 transition-all text-left relative overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.1)]"
              >
                {/* Best Value Badge */}
                <div className="absolute top-3 right-3 px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 text-black flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  BEST VALUE
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-yellow-400">$84.99</span>
                    </div>
                    <div className="font-medium mt-1">Community Goal Lifetime</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      One-Time Payment — Forever Premium
                    </div>
                  </div>
                  {isLoading && selectedPlan === "lifetime" ? (
                    <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                  ) : (
                    <Crown className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
              </motion.button>
            </div>

            {/* Cancel anytime */}
            <p className="text-xs text-muted-foreground text-center">
              Cancel the monthly plan anytime. No questions asked.
            </p>
          </motion.div>
        </div>
      </main>

      <ToolsScroller />
    </div>
  );
};

export default CommunityGoalReward;
