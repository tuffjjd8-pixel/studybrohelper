import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, CreditCard, BarChart3, Activity, Heart } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CommunityGoalEditor } from "@/components/community/CommunityGoalEditor";

interface AdminSettingsProps {
  userEmail: string | undefined;
}

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

type ToggleKey =
  | "community_goal_enabled"
  | "reward_claiming_enabled"
  | "gifting_enabled"
  | "sync_enabled"
  | "show_community_goal_home"
  | "enable_reward_screen"
  | "enable_progress_bar"
  ;

const TOGGLE_DEFS: { key: ToggleKey; label: string }[] = [
  { key: "community_goal_enabled", label: "Enable Community Goal" },
  { key: "reward_claiming_enabled", label: "Enable Reward Claiming" },
  { key: "gifting_enabled", label: "Enable Gifting" },
  { key: "sync_enabled", label: "Enable Auto-Sync" },
  { key: "show_community_goal_home", label: "Show Community Goal on Home" },
  { key: "enable_reward_screen", label: "Enable Reward Screen" },
  { key: "enable_progress_bar", label: "Enable Progress Bar" },
  
];

export const AdminSettings = ({ userEmail }: AdminSettingsProps) => {
  const navigate = useNavigate();
  const [stripeMode, setStripeMode] = useState<"test" | "live">("live");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    community_goal_enabled: false,
    reward_claiming_enabled: false,
    gifting_enabled: false,
    sync_enabled: false,
    show_community_goal_home: false,
    enable_reward_screen: false,
    enable_progress_bar: false,
    
  });
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchAllSettings();
    }
  }, [isAdmin]);

  const fetchAllSettings = async () => {
    console.log("[Admin] Loading all settings...");
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const newToggles = { ...toggles };
      let loadedStripeMode: "test" | "live" = "live";
      

      data?.forEach((row) => {
        if (row.key === "stripe_mode") {
          loadedStripeMode = row.value as "test" | "live";
        } else if (row.key in newToggles) {
          newToggles[row.key as ToggleKey] = row.value === "true";
        }
      });

      setStripeMode(loadedStripeMode);
      setToggles(newToggles);
      
      console.log("[Admin] Settings loaded successfully", { toggles: newToggles, stripeMode: loadedStripeMode });
    } catch (error) {
      console.error("[Admin] Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleChange = async (key: ToggleKey, checked: boolean) => {
    console.log(`[Admin] Toggle clicked: ${key} → ${checked}`);
    setSavingToggle(key);

    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: String(checked), updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;

      setToggles((prev) => ({ ...prev, [key]: checked }));
      console.log(`[Admin] Toggle saved: ${key} = ${checked}`);
      toast.success(`${TOGGLE_DEFS.find((t) => t.key === key)?.label} ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error(`[Admin] Toggle save failed: ${key}`, error);
      toast.error("Failed to update setting");
    } finally {
      setSavingToggle(null);
    }
  };

  const handleStripeModeToggle = async (checked: boolean) => {
    const newMode = checked ? "test" : "live";
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: newMode, updated_at: new Date().toISOString() })
        .eq("key", "stripe_mode");

      if (error) throw error;

      setStripeMode(newMode);
      toast.success(`Stripe mode switched to ${newMode.toUpperCase()}`);
    } catch (error) {
      console.error("Error updating stripe mode:", error);
      toast.error("Failed to update Stripe mode");
    } finally {
      setIsUpdating(false);
    }
  };


  const handleResetCommunityGoal = async () => {
    console.log("[Admin] Resetting community goal...");
    setIsResetting(true);

    try {
      const { error } = await supabase
        .from("community_goal_content")
        .update({ visible: false, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      localStorage.removeItem("community_goal_cache");
      console.log("[Admin] Community goal reset successfully");
      toast.success("Community goal reset to 0");
    } catch (error) {
      console.error("[Admin] Community goal reset failed:", error);
      toast.error("Failed to reset community goal");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncNow = async () => {
    console.log("[Admin] Syncing community goal data...");
    setIsSyncing(true);

    try {
      localStorage.removeItem("community_goal_cache");
      localStorage.removeItem("community_goal_flags");
      await fetchAllSettings();
      console.log("[Admin] Sync completed successfully");
      toast.success("Sync completed — data refreshed");
    } catch (error) {
      console.error("[Admin] Sync failed:", error);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="space-y-4"
    >
      {/* Admin Section Header */}
      <div className="flex items-center gap-2 text-primary">
        <Settings className="w-5 h-5" />
        <h3 className="font-heading font-bold text-lg">Admin Controls</h3>
      </div>

      {/* Stripe Mode Toggle */}
      <div className="p-4 bg-card rounded-xl border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Stripe Mode</p>
              <p className="text-xs text-muted-foreground">
                Currently: <span className={stripeMode === "test" ? "text-orange-500" : "text-green-500"}>
                  {stripeMode.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Live</span>
            <Switch
              checked={stripeMode === "test"}
              onCheckedChange={handleStripeModeToggle}
              disabled={isUpdating || isLoading}
            />
            <span className="text-xs text-orange-500">Test</span>
          </div>
        </div>
        {stripeMode === "test" && (
          <p className="text-xs text-orange-500 mt-2">
            ⚠️ Test mode active - payments won't be real
          </p>
        )}
      </div>

      {/* 8 Feature Toggles */}
      <div className="p-4 bg-card rounded-xl border border-border space-y-3">
        <p className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Feature Toggles</p>
        {TOGGLE_DEFS.map((t) => (
          <div key={t.key} className="flex items-center justify-between py-1">
            <span className="text-sm font-medium">{t.label}</span>
            <Switch
              checked={toggles[t.key]}
              onCheckedChange={(checked) => handleToggleChange(t.key, checked)}
              disabled={savingToggle === t.key || isLoading}
            />
          </div>
        ))}
      </div>

      {/* Community Goal Editor */}
      <CommunityGoalEditor userEmail={userEmail} />

      {/* Usage & Cost Dashboard */}
      <Button
        variant="outline"
        onClick={() => navigate("/admin/usage")}
        className="w-full justify-start gap-2"
      >
        <Activity className="w-4 h-4" />
        Usage & Cost Dashboard
      </Button>

      {/* Poll Management Button */}
      <Button
        variant="outline"
        onClick={() => navigate("/polls")}
        className="w-full justify-start gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Manage Polls
      </Button>

      {/* Share Likes Admin */}
      <Button
        variant="outline"
        onClick={() => navigate("/admin/share-likes")}
        className="w-full justify-start gap-2"
      >
        <Heart className="w-4 h-4" />
        Share Likes Submissions
      </Button>

      {/* Settings Button */}
      <Button
        variant="outline"
        onClick={() => navigate("/settings")}
        className="w-full justify-start gap-2"
      >
        <Settings className="w-4 h-4" />
        App Settings
      </Button>
    </motion.div>
  );
};
