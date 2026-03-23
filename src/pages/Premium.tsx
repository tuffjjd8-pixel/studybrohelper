import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  Zap,
  Target,
  ArrowLeft,
  Calculator,
  Heart,
  Shield,
  Brain,
  Loader2,
} from "lucide-react";
import { playBillingService } from "@/lib/playBilling";

interface ComparisonItem {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}

const COMPARISON: ComparisonItem[] = [
  { feature: "Instant Mode (Image)", free: "3/day", premium: "300/month" },
  { feature: "Ask (Text Solves)", free: "4/day", premium: "300/month" },
  { feature: "Deep Mode", free: "100/month", premium: "Unlimited" },
  { feature: "Essay Mode", free: "1/day (limited)", premium: "Unlimited (full)" },
  { feature: "Follow-Ups", free: "1 per solve", premium: "200/month" },
  { feature: "Humanize", free: false, premium: "80/month" },
  { feature: "Quiz Generator", free: "1/day (max 10 Qs)", premium: "899/month (max 20 Qs)" },
  { feature: "Strict Count Mode", free: false, premium: true },
  { feature: "Enhanced OCR", free: "Basic", premium: "Premium" },
  { feature: "Priority Speed", free: false, premium: true },
  { feature: "Ad-Free Experience", free: true, premium: true },
  { feature: "Full Quiz Review", free: false, premium: true },
  { feature: "History", free: "Today only", premium: "Unlimited" },
  { feature: "Language Control", free: "Unlimited", premium: "Unlimited" },
];

const PREMIUM_BENEFITS = [
  { icon: Brain, title: "400 Solves/Month", description: "300 Instant + 100 Deep combined" },
  { icon: Calculator, title: "Scientific Calculator", description: "Advanced reasoning & logic" },
  { icon: Target, title: "Premium OCR", description: "Enhanced image recognition" },
  { icon: Zap, title: "Priority Speed", description: "Skip the queue" },
  { icon: Shield, title: "Ad-Free", description: "Distraction-free learning" },
];

// Google Play product ID — configure this in Google Play Console
const PLAY_SUBSCRIPTION_PRODUCT_ID = "studybro_premium_monthly";

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkPremium = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("user_id", user.id)
        .single();
      if (data?.is_premium) setUserIsPremium(true);
    };
    checkPremium();
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      if (playBillingService.isAvailable()) {
        // Native Google Play Billing flow
        const purchase = await playBillingService.purchaseSubscription(PLAY_SUBSCRIPTION_PRODUCT_ID);
        if (purchase) {
          toast.success("Subscription activated! 🎉");
          setUserIsPremium(true);
        } else {
          toast.error("Purchase was cancelled or failed");
        }
      } else {
        // Web fallback — direct to external page
        window.open("https://www.studybro.trade/premium", "_blank");
      }
    } catch (err) {
      console.error("Subscribe error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* Already Premium Banner */}
            {userIsPremium && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">You're already Premium!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription in Google Play Store settings.
                </p>
              </div>
            )}

            {/* Subscribe Button */}
            {!userIsPremium && (
              <div className="space-y-3">
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="w-full h-14 text-lg font-bold gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5" />
                      Subscribe to Premium
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Cancel anytime via Google Play Store. No questions asked.
                </p>
              </div>
            )}

            {/* Comparison Table */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg text-center">Free vs Premium</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/50 p-3 font-medium text-sm">
                  <div>Feature</div>
                  <div className="text-center">Free</div>
                  <div className="text-center text-primary">Premium</div>
                </div>
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
                          <X className="w-4 h-4 mx-auto text-muted-foreground" />
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
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Premium;
