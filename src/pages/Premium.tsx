import { useState, useMemo } from "react";
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
  X,
  Zap,
  Target,
  MessageSquare,
  ArrowLeft,
  Calculator,
  Heart,
  Shield,
  Brain,
  Loader2,
} from "lucide-react";

interface ComparisonItem {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}

type PlanType = "monthly" | "weekend" | "yearly";

interface PlanOption {
  id: PlanType;
  name: string;
  price: number;
  period: string;
  description: string;
  badge?: string;
  savings?: string;
}

const PLANS: PlanOption[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: 5.99,
    period: "/month",
    description: "Full premium access",
  },
  {
    id: "weekend",
    name: "Weekend Special",
    price: 4.99,
    period: "/month",
    description: "Limited time offer",
    badge: "🎉 SAVE $1",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 40,
    period: "/year",
    description: "Best value",
    badge: "BEST VALUE",
    savings: "Save $31.88/year",
  },
];

const COMPARISON: ComparisonItem[] = [
  { feature: "Daily Solves", free: "Unlimited", premium: "Unlimited" },
  { feature: "Animated Steps", free: "5/day", premium: "16/day" },
  { feature: "Speech to Text", free: false, premium: "25/day" },
  { feature: "AI Model", free: "Standard", premium: "Advanced" },
  { feature: "Enhanced OCR", free: false, premium: true },
  { feature: "Priority Speed", free: false, premium: true },
  { feature: "Ad-Free Experience", free: true, premium: true },
  { feature: "Quiz Generator", free: "7/day (max 10 Qs)", premium: "13/day (max 20 Qs)" },
  { feature: "Strict Count Mode", free: false, premium: true },
  { feature: "Calculator", free: "Basic", premium: "Scientific" },
];

const PREMIUM_BENEFITS = [
  { icon: Brain, title: "16 Animated Steps/Day", description: "Detailed step-by-step breakdowns" },
  { icon: Calculator, title: "Premium Calculator", description: "Advanced reasoning & logic" },
  { icon: Target, title: "Enhanced Image Solving", description: "Better OCR accuracy" },
  { icon: Zap, title: "Priority Response", description: "Skip the queue" },
  { icon: Shield, title: "No Ads", description: "Distraction-free learning" },
  { icon: MessageSquare, title: "Latest AI Models", description: "Cutting-edge technology" },
];

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if it's Friday (5) or Saturday (6) for weekend discount visibility
  const isWeekendDiscount = useMemo(() => {
    const today = new Date().getDay();
    return today === 5 || today === 6;
  }, []);

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("createCheckoutSession", {
        body: { userId: user.id, plan: selectedPlan },
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

            {/* Plan Selection */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg text-center">Choose Your Plan</h2>
              <div className="space-y-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isWeekendPlan = plan.id === "weekend";
                  
                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-4 rounded-2xl border-2 transition-all relative overflow-hidden text-left ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-lg"
                          : "border-border bg-card hover:border-muted-foreground/50"
                      } ${isWeekendPlan && !isWeekendDiscount ? "opacity-60" : ""}`}
                      disabled={isWeekendPlan && !isWeekendDiscount}
                    >
                      {/* Badge */}
                      {plan.badge && (
                        <div className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-bold rounded-full ${
                          plan.id === "yearly" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary text-secondary-foreground animate-pulse"
                        }`}>
                          {plan.badge}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {/* Selection indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">${plan.price.toFixed(2)}</span>
                            <span className="text-muted-foreground text-sm">{plan.period}</span>
                          </div>
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">{plan.description}</div>
                          {plan.savings && (
                            <div className="text-xs text-primary font-medium mt-1">{plan.savings}</div>
                          )}
                          {isWeekendPlan && !isWeekendDiscount && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Available Fri-Sat only
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

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
          </motion.div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleCheckout}
            disabled={!selectedPlan || isLoading}
            className="w-full h-14 text-lg font-bold gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating checkout...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                {selectedPlan 
                  ? `Continue - $${PLANS.find(p => p.id === selectedPlan)?.price.toFixed(2)}${PLANS.find(p => p.id === selectedPlan)?.period}`
                  : "Select a plan to continue"
                }
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Premium;
