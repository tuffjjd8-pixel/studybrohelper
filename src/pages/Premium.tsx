import { useState, useEffect } from "react";
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
  ArrowLeft,
  Loader2,
  Users,
} from "lucide-react";
import { playBillingService } from "@/lib/playBilling";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";

// Google Play product ID — configure this in Google Play Console
const PLAY_SUBSCRIPTION_PRODUCT_ID = "studybro_premium_monthly";

const BENEFITS = [
  "Unlimited solves",
  "Deep Mode (Best Accuracy)",
  "Priority speed (faster solves)",
  "Step-by-Step Explanations",
  "No limits",
];

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
        const purchase = await playBillingService.purchaseSubscription(PLAY_SUBSCRIPTION_PRODUCT_ID);
        if (purchase) {
          toast.success("Subscription activated! 🎉");
          setUserIsPremium(true);
        } else {
          toast.error("Purchase was cancelled or failed");
        }
      } else {
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <Header streak={0} totalSolves={0} isPremium={false} />

      <main className="pt-20 pb-32 px-4 relative z-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Hero — Brain Icon */}
            <div className="text-center pt-2">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-full blur-[40px] scale-150" />
                  <AIBrainIcon size="lg" glowIntensity="strong" />
                </div>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
                Unlock StudyBro{" "}
                <span className="text-gradient">Premium</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Solve homework instantly with better accuracy &amp; unlimited access.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-2 tracking-wide">
                ✦ Trusted by thousands of students ✦
              </p>
            </div>

            {/* Already Premium Banner */}
            {userIsPremium && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">
                    You're already Premium!
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription in Google Play Store settings.
                </p>
              </div>
            )}

            {/* Benefits checklist */}
            <div className="space-y-3 pl-2">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-foreground text-sm sm:text-base font-medium">
                    {b}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Most Popular — $5.99/month */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative rounded-xl border-2 border-primary/60 bg-card p-4 flex flex-col items-center text-center"
                style={{
                  boxShadow: "0 0 24px hsl(82 100% 67% / 0.15), inset 0 1px 0 hsl(82 100% 67% / 0.1)",
                }}
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </span>
                <p className="text-3xl font-heading font-bold text-foreground mt-3">
                  $5.99
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Unlimited solves + Deep&nbsp;Mode
                </p>
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading || userIsPremium}
                  size="sm"
                  className="w-full gap-1 font-bold"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Start Premium"
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  Most students choose this
                </p>
              </motion.div>

              {/* Best Value — $59.99/year */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Best Value
                </span>
                <p className="text-3xl font-heading font-bold text-foreground mt-3">
                  $59.99
                  <span className="text-sm font-normal text-muted-foreground">
                    /year
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ $4.99/month
                </p>
                <p className="text-xs text-primary font-semibold mb-4">
                  Save $12/year
                </p>
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading || userIsPremium}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 font-bold border-primary/40 hover:bg-primary/10"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get Yearly →"
                  )}
                </Button>
              </motion.div>
            </div>

            {/* Premium Monthly $7.99 + Spin section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5"
            >
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Left: price details */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs text-muted-foreground mb-1">
                    Applies to:
                  </p>
                  <p className="font-heading font-bold text-foreground">
                    Premium Monthly ($7.99)
                  </p>
                  <p className="text-2xl font-heading font-bold text-foreground mt-1">
                    $7.99
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ $4.99/month &middot; Save $12/year
                  </p>
                </div>

                {/* Right: Spin wheel placeholder */}
                <div className="relative w-32 h-32 shrink-0">
                  <div className="w-full h-full rounded-full border-4 border-primary/40 bg-gradient-to-br from-primary/20 via-secondary/20 to-destructive/20 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                      <span className="text-primary-foreground font-heading font-bold text-sm">
                        SPIN
                      </span>
                    </div>
                  </div>
                  {/* Indicator */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-primary-foreground" />
                </div>
              </div>

              <p className="text-center text-xs text-primary mt-3 font-medium">
                Spin to unlock a discount on Premium Monthly ($7.99)
              </p>
            </motion.div>

            {/* Community Rewards Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="rounded-xl border border-border bg-card/60 p-4 flex items-start gap-3"
            >
              <Users className="w-8 h-8 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-heading font-bold text-foreground text-sm">
                  Community Rewards{" "}
                  <span className="text-muted-foreground font-normal">
                    Coming Soon
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  $4.99/month &amp; 2-Year Pro Deal
                </p>
                <p className="text-xs text-muted-foreground">
                  Help us reach our goal!
                </p>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            {!userIsPremium && (
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="w-full h-14 text-lg font-bold gap-2"
                  style={{
                    boxShadow: "0 0 20px hsl(82 100% 67% / 0.25)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue with Premium"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="w-full h-12 text-base font-medium border-border text-muted-foreground hover:text-foreground"
                >
                  Continue with Free
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Premium;
