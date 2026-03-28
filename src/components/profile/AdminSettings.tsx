import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, BarChart3, Activity, Shield } from "lucide-react";
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
  | "reward_claiming_enabled"
  | "gifting_enabled"
  | "sync_enabled"
  | "enable_reward_screen"
  | "enable_progress_bar"
  | "participate_in_community_goal";

const TOGGLE_DEFS: { key: ToggleKey; label: string }[] = [
  { key: "reward_claiming_enabled", label: "Enable Reward Claiming" },
  { key: "gifting_enabled", label: "Enable Gifting" },
  { key: "sync_enabled", label: "Enable Auto-Sync" },
  { key: "enable_reward_screen", label: "Enable Reward Screen" },
  { key: "enable_progress_bar", label: "Enable Progress Bar" },
  { key: "participate_in_community_goal", label: "Participate in Community Goal" },
];

export const AdminSettings = ({ userEmail }: AdminSettingsProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    reward_claiming_enabled: false,
    gifting_enabled: false,
    sync_enabled: false,
    enable_reward_screen: false,
    enable_progress_bar: false,
    participate_in_community_goal: true,
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
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const newToggles = { ...toggles };
      data?.forEach((row) => {
        if (row.key in newToggles) {
          newToggles[row.key as ToggleKey] = row.value === "true";
        }
      });

      setToggles(newToggles);
    } catch (error) {
      console.error("[Admin] Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleChange = async (key: ToggleKey, checked: boolean) => {
    setSavingToggle(key);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: String(checked), updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;
      setToggles((prev) => ({ ...prev, [key]: checked }));
      toast.success(`${TOGGLE_DEFS.find((t) => t.key === key)?.label} ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error(`[Admin] Toggle save failed: ${key}`, error);
      toast.error("Failed to update setting");
    } finally {
      setSavingToggle(null);
    }
  };

  const handleResetCommunityGoal = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from("community_goal_content")
        .update({ visible: false, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      localStorage.removeItem("community_goal_cache");
      toast.success("Community goal reset to 0");
    } catch (error) {
      console.error("[Admin] Community goal reset failed:", error);
      toast.error("Failed to reset community goal");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      localStorage.removeItem("community_goal_cache");
      localStorage.removeItem("community_goal_flags");
      await fetchAllSettings();
      toast.success("Sync completed — data refreshed");
    } catch (error) {
      console.error("[Admin] Sync failed:", error);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 text-primary">
        <Settings className="w-5 h-5" />
        <h3 className="font-heading font-bold text-lg">Admin Controls</h3>
      </div>

      {/* Feature Toggles */}
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

      <CommunityGoalEditor userEmail={userEmail} />

      <Button
        variant="outline"
        onClick={() => navigate("/admin/usage")}
        className="w-full justify-start gap-2"
      >
        <Activity className="w-4 h-4" />
        Usage & Cost Dashboard
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate("/polls")}
        className="w-full justify-start gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Manage Polls
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate("/admin/security-events")}
        className="w-full justify-start gap-2"
      >
        <Shield className="w-4 h-4" />
        🛡 Security Events Log
      </Button>

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
