import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, CreditCard, BarChart3, Activity, Heart, RefreshCw, RotateCcw, ToggleLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AdminSettingsProps {
  userEmail: string | undefined;
}

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

export const AdminSettings = ({ userEmail }: AdminSettingsProps) => {
  const navigate = useNavigate();
  const [stripeMode, setStripeMode] = useState<"test" | "live">("live");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Community goal toggles
  const [communityGoalEnabled, setCommunityGoalEnabled] = useState(true);
  const [rewardClaimingEnabled, setRewardClaimingEnabled] = useState(true);
  const [giftingEnabled, setGiftingEnabled] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchAllSettings();
    }
  }, [isAdmin]);

  const fetchAllSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;
      if (data) {
        for (const row of data) {
          switch (row.key) {
            case "stripe_mode": setStripeMode(row.value as "test" | "live"); break;
            case "community_goal_enabled": setCommunityGoalEnabled(row.value === "true"); break;
            case "reward_claiming_enabled": setRewardClaimingEnabled(row.value === "true"); break;
            case "gifting_enabled": setGiftingEnabled(row.value === "true"); break;
            case "sync_enabled": setSyncEnabled(row.value === "true"); break;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;
      toast.success(`${key.replace(/_/g, " ")} updated`);
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      toast.error(`Failed to update ${key}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStripeModeToggle = async (checked: boolean) => {
    const newMode = checked ? "test" : "live";
    setStripeMode(newMode);
    await updateSetting("stripe_mode", newMode);
  };

  const handleCommunityGoalToggle = async (key: string, checked: boolean, setter: (v: boolean) => void) => {
    setter(checked);
    await updateSetting(key, String(checked));
  };

  const handleResetCommunityGoal = async () => {
    setIsResetting(true);
    try {
      // Reset community goal content visibility
      const { error } = await supabase
        .from("community_goal_content")
        .update({ visible: false, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      // Clear local cache
      localStorage.removeItem("community_goal_cache");
      localStorage.removeItem("community_goal_cache_ts");

      toast.success("Community goal reset complete");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Failed to reset community goal");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      // Clear all cached flags
      localStorage.removeItem("community_goal_cache");
      localStorage.removeItem("community_goal_cache_ts");
      localStorage.removeItem("admin_controls_cache");
      localStorage.removeItem("admin_controls_cache_ts");

      // Re-fetch settings to confirm sync
      await fetchAllSettings();

      toast.success("Sync complete — all caches cleared");
    } catch (error) {
      console.error("Sync error:", error);
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

      {/* Community Goal Toggles */}
      <div className="p-4 bg-card rounded-xl border border-border space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <ToggleLeft className="w-4 h-4 text-primary" />
          <p className="font-medium text-sm">Community Goal Toggles</p>
        </div>

        {[
          { key: "community_goal_enabled", label: "Community Goal", value: communityGoalEnabled, setter: setCommunityGoalEnabled },
          { key: "reward_claiming_enabled", label: "Reward Claiming", value: rewardClaimingEnabled, setter: setRewardClaimingEnabled },
          { key: "gifting_enabled", label: "Gifting", value: giftingEnabled, setter: setGiftingEnabled },
          { key: "sync_enabled", label: "Auto Sync", value: syncEnabled, setter: setSyncEnabled },
        ].map((toggle) => (
          <div key={toggle.key} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{toggle.label}</span>
            <Switch
              checked={toggle.value}
              onCheckedChange={(checked) => handleCommunityGoalToggle(toggle.key, checked, toggle.setter)}
              disabled={isUpdating || isLoading}
            />
          </div>
        ))}
      </div>

      {/* Community Goal Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleResetCommunityGoal}
          disabled={isResetting}
          className="flex-1 gap-2"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
          {isResetting ? "Resetting..." : "Reset Goal"}
        </Button>
        <Button
          variant="outline"
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="flex-1 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

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
