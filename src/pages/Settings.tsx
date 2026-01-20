import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle,
  LogIn,
  Crown,
  LogOut,
  Clock,
  Mic
} from "lucide-react";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { useSpeechClips } from "@/hooks/useSpeechClips";

const FREE_ANIMATED_STEPS_PER_DAY = 5;
const PREMIUM_ANIMATED_STEPS_PER_DAY = 16;

interface Profile {
  is_premium: boolean;
  animated_steps_used_today: number;
}

// Helper to get current date in user's local timezone
const getLocalDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isPremium = profile?.is_premium || false;
  const speechClips = useSpeechClips(user?.id, isPremium);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      loadGuestLimits();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_premium, animated_steps_used_today, last_usage_date")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      // Check if needs reset
      const today = getLocalDate();
      if (data && data.last_usage_date !== today) {
        setProfile({
          is_premium: data.is_premium,
          animated_steps_used_today: 0
        });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuestLimits = () => {
    const guestData = localStorage.getItem("guest_usage");
    const today = getLocalDate();
    
    if (guestData) {
      const parsed = JSON.parse(guestData);
      
      if (parsed.date === today) {
        setProfile({
          is_premium: false,
          animated_steps_used_today: parsed.animatedSteps || 0,
        });
      } else {
        // Reset for new day
        setProfile({
          is_premium: false,
          animated_steps_used_today: 0,
        });
      }
    } else {
      setProfile({
        is_premium: false,
        animated_steps_used_today: 0,
      });
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const settingsItems = [
    { icon: Bell, label: "Notifications", description: "Manage notification preferences" },
    { icon: Moon, label: "Appearance", description: "Dark mode, theme settings" },
    { icon: Shield, label: "Privacy", description: "Data and privacy settings" },
    { icon: HelpCircle, label: "Help & Support", description: "FAQs and contact support" },
  ];

  const maxAnimatedSteps = isPremium ? PREMIUM_ANIMATED_STEPS_PER_DAY : FREE_ANIMATED_STEPS_PER_DAY;
  const animatedStepsUsed = profile?.animated_steps_used_today || 0;
  const animatedStepsRemaining = maxAnimatedSteps - animatedStepsUsed;
  const usagePercent = (animatedStepsUsed / maxAnimatedSteps) * 100;
  const speechUsagePercent = ((speechClips.maxClips - speechClips.clipsRemaining) / speechClips.maxClips) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={isPremium} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-heading font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Customize your StudyBro experience
                </p>
              </div>
            </div>

            {/* Premium Status */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-xl border ${
                isPremium 
                  ? "bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 border-primary/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isPremium ? "bg-primary/20" : "bg-muted"}`}>
                    <Crown className={`w-6 h-6 ${isPremium ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{isPremium ? "Premium Active" : "Free Plan"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPremium ? "All premium features unlocked" : "Upgrade for more features"}
                    </p>
                  </div>
                </div>
                {!isPremium && (
                  <Button 
                    size="sm"
                    onClick={() => navigate("/premium")}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Daily Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Daily Usage</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Resets at midnight
                </span>
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <AIBrainIcon size="md" glowIntensity="medium" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Animated Steps</span>
                      <span className="text-sm text-muted-foreground">
                        {animatedStepsUsed}/{maxAnimatedSteps}
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {animatedStepsRemaining} remaining today
                  {!isPremium && " • Upgrade for 16/day"}
                </p>
              </motion.div>

              {/* Speech Clips - Only show for premium */}
              {isPremium && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 bg-card rounded-xl border border-border"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Mic className="w-5 h-5 text-secondary" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Speech Clips</span>
                        <span className="text-sm text-muted-foreground">
                          {speechClips.clipsRemaining}/{speechClips.maxClips}
                        </span>
                      </div>
                      <Progress value={speechUsagePercent} className="h-2" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {speechClips.clipsRemaining} remaining
                    {speechClips.hoursUntilReset > 0 && ` • Resets in ${speechClips.hoursUntilReset}h`}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Sign In / Sign Out Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-card rounded-xl border border-border"
            >
              {user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">Signed in</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sign in (optional)</p>
                    <p className="text-sm text-muted-foreground">
                      Sync progress across devices
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Settings list */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Preferences</h3>
              {settingsItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="w-full p-4 bg-card rounded-xl border border-border flex items-center gap-4 hover:bg-card/80 transition-colors text-left"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* App info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center py-8 text-muted-foreground"
            >
              <SettingsIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">StudyBro AI v1.0.0</p>
              <p className="text-xs mt-1">© 2025 StudyBro AI. All rights reserved.</p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
