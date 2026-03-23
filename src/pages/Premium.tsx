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
  Zap,
  BookOpen,
  Shield,
  Brain,
  Star,
} from "lucide-react";
import { playBillingService } from "@/lib/playBilling";

const PLAY_SUBSCRIPTION_PRODUCT_ID = "studybro_premium_monthly";

interface PlanCard {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  wheelEligible?: boolean;
}

const PLANS: PlanCard[] = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$6.99",
    period: "/week",
    description: "Try Pro risk-free for a week",
  },
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: "$5.99",
    period: "/month",
    description: "Unlimited solves + Deep Mode",
    badge: "MOST POPULAR",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    id: "premium_monthly",
    name: "Premium Monthly",
    price: "$7.99",
    period: "/month",
    description: "Everything in Pro + Wheel discounts",
    wheelEligible: true,
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    price: "$59.99",
    period: "/year",
    description: "≈ $4.99/mo — Save $12/year",
    badge: "BEST VALUE",
    badgeColor: "bg-secondary text-secondary-foreground",
  },
  {
    id: "community_monthly",
    name: "Community Monthly",
    price: "$4.99",
    period: "/month",
    description: "Support the community & get Pro",
  },
  {
    id: "two_year",
    name: "2-Year Pro",
    price: "$84.99",
    period: "one-time",
    description: "Lock in 2 years of Pro access",
  },
];

const BENEFITS = [
  { icon: Brain, title: "Unlimited AI Homework Help", description: "Solve any problem, any subject, any time" },
  { icon: BookOpen, title: "Step-by-Step Explanations", description: "Understand every solution clearly" },
  { icon: Star, title: "Test Mode", description: "Practice with AI-generated quizzes" },
  { icon: Zap, title: "Priority Features", description: "Faster solves & early access to new tools" },
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
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={false} />

      <main className="pt-20 pb-32 px-4">
        <div className="max-w-2xl mx-auto space-y-10">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3 pt-2"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Unlock <span className="text-primary">StudyBro Pro</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose the plan that fits your study journey
            </p>
            <p className="text-xs text-muted-foreground/70">Trusted by thousands of students</p>
          </motion.section>

          {/* Already Premium */}
          {userIsPremium && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">You're already Pro!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your subscription in Google Play Store settings.
              </p>
            </div>
          )}

          {/* Benefits */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-center">What you get</h2>
            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl border border-border bg-card space-y-2"
                >
                  <b.icon className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium leading-tight">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Pricing Grid */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Plans</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLANS.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`relative p-5 rounded-xl border bg-card space-y-3 ${
                    plan.badge ? "border-primary/40" : "border-border"
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`absolute -top-2.5 left-4 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${plan.badgeColor}`}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                    <p className="text-2xl font-heading font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        {plan.period}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <Button
                    onClick={handleSubscribe}
                    disabled={isLoading || userIsPremium}
                    variant={plan.badge ? "default" : "outline"}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : userIsPremium ? (
                      "Current Plan"
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Wheel Section */}
          <section className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">Spin the Wheel for a Special Price</h2>
            <p className="text-xs text-muted-foreground">
              Applies to Premium Monthly ($7.99) only
            </p>
            <div className="mx-auto w-48 h-48 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-card">
              <span className="text-muted-foreground text-sm">Wheel Placeholder</span>
            </div>
            <Button variant="outline" size="lg" className="gap-2">
              <Star className="w-4 h-4" />
              Spin Now
            </Button>
          </section>

          {/* Community Rewards teaser */}
          <section className="p-4 rounded-xl border border-border bg-card text-center space-y-1">
            <p className="text-sm font-medium">Community Rewards Coming Soon</p>
            <p className="text-xs text-muted-foreground">
              $4.99/month & 2-Year Pro Deal — Help us reach our goal!
            </p>
          </section>

          {/* Bottom CTAs */}
          {!userIsPremium && (
            <div className="space-y-3 pt-2">
              <Button onClick={handleSubscribe} disabled={isLoading} className="w-full h-14 text-base font-bold gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                {isLoading ? "Processing..." : "Continue with Premium"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
                Continue with Free
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Cancel anytime via Google Play Store. No questions asked.
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Premium;
