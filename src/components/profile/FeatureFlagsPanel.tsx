import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ToggleLeft, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface Flag {
  id: string;
  feature_name: string;
  enabled_for_all: boolean;
  enabled_for_admin: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  show_humanize: "Humanize Answer",
  show_followups: "Follow-up Chat",
  show_graph_maker: "Graph Maker",
  show_advanced_results: "Advanced Results",
  show_extra_tools: "Extra Tools",
  show_community_goal: "Community Goal",
};

interface FeatureFlagsPanelProps {
  userEmail: string | undefined;
}

export const FeatureFlagsPanel = ({ userEmail }: FeatureFlagsPanelProps) => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) fetchFlags();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const fetchFlags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("feature_name");

    if (!error && data) setFlags(data as Flag[]);
    setLoading(false);
  };

  const toggleFlag = async (flag: Flag, field: "enabled_for_all" | "enabled_for_admin") => {
    setUpdating(flag.id);
    const newValue = !flag[field];

    const { error } = await supabase
      .from("feature_flags")
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq("id", flag.id);

    if (error) {
      toast.error("Failed to update flag");
    } else {
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, [field]: newValue } : f))
      );
      // Clear cache so the app picks up changes
      localStorage.removeItem("feature_flags_cache");
      toast.success(`${FEATURE_LABELS[flag.feature_name] || flag.feature_name} ${newValue ? "enabled" : "disabled"}`);
    }
    setUpdating(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <ToggleLeft className="w-5 h-5" />
          <h3 className="font-heading font-bold text-lg">Feature Controls</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchFlags} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="p-4 bg-card rounded-xl border border-border text-center text-muted-foreground text-sm">
          Loading flags...
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="p-3 bg-card rounded-xl border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">
                  {FEATURE_LABELS[flag.feature_name] || flag.feature_name}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={flag.enabled_for_all}
                    onCheckedChange={() => toggleFlag(flag, "enabled_for_all")}
                    disabled={updating === flag.id}
                  />
                  Users
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={flag.enabled_for_admin}
                    onCheckedChange={() => toggleFlag(flag, "enabled_for_admin")}
                    disabled={updating === flag.id}
                  />
                  Admin
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
