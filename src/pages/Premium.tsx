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
  Zap,
  Target,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Calculator,
  LineChart,
  Heart,
} from "lucide-react";

const PREMIUM_FEATURES = [
  {
    icon: Sparkles,
    title: "16 Animated Steps",
    description: "Detailed animated breakdowns for deeper understanding",
  },
  {
    icon: Calculator,
    title: "Premium Calculator",
    description: "Pick your model, advanced logic chaining & reasoning",
  },
  {
    icon: LineChart,
    title: "15 Graphs Per Day",
    description: "Create more visualizations to master concepts",
  },
  {
    icon: Target,
    title: "Enhanced Image Solving",
    description: "Better OCR, formatting, and reasoning accuracy",
  },
  {
    icon: Zap,
    title: "Priority Response Speed",
    description: "Skip the queue with faster processing times",
  },
  {
    icon: MessageSquare,
    title: "Latest AI Models",
    description: "Access to Groq's cutting-edge text + vision models",
  },
  {
    icon: Heart,
    title: "Support Development",
    description: "Help us build more amazing features for students",
  },
];

const FREE_FEATURES = [
  {
    label: "Unlimited solves",
    description: "Solve as many problems as you need",
  },
  {
    label: "5 animated steps",
    description: "Clear step-by-step breakdowns",
  },
  {
    label: "Basic calculator",
    description: "Powerful solving, no model selection",
  },
  {
    label: "4 graphs per day",
    description: "Visualize your math problems",
  },
  {
    label: "Text + image solving",
    description: "Snap or type your homework",
  },
];

const Premium = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Check if it's Friday (5) or Saturday (6) for weekend discount
  const isWeekendDiscount = useMemo(() => {
    const today = new Date().getDay();
    return today === 5 || today === 6; // Friday = 5, Saturday = 6
  }, []);

  const currentPrice = isWeekendDiscount ? 4.99 : 8.0;
  const regularPrice = 8.0;

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

      toast.success("🎉 Welcome to Premium! You're all set!");
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

            {/* Premium Features list */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">Premium Features</h2>
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

            {/* Free Plan Comparison */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">
                Free Plan — Already Powerful
              </h2>
              <div className="p-4 bg-card rounded-lg border border-border">
                <ul className="space-y-3">
                  {FREE_FEATURES.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3"
                    >
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium">{feature.label}</span>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Premium takes everything further — more steps, more graphs, faster & smarter AI.
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
