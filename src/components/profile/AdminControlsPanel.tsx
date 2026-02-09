import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings2, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface Control {
  id: string;
  feature_key: string;
  visible_for_users: boolean;
  visible_for_admin: boolean;
}

interface AdminControlsPanelProps {
  userEmail: string | undefined;
}

export const AdminControlsPanel = ({ userEmail }: AdminControlsPanelProps) => {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) fetchControls();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const fetchControls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_controls")
      .select("id, feature_key, visible_for_users, visible_for_admin")
      .eq("feature_key", "community_goal")
      .order("feature_key");

    if (!error && data) setControls(data);
    setLoading(false);
  };

  const toggleControl = async (control: Control, field: "visible_for_users" | "visible_for_admin") => {
    setUpdating(control.id);
    const newValue = !control[field];

    const { error } = await supabase
      .from("admin_controls")
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq("id", control.id);

    if (error) {
      toast.error("Failed to update control");
    } else {
      setControls((prev) =>
        prev.map((c) => (c.id === control.id ? { ...c, [field]: newValue } : c))
      );
      localStorage.removeItem("admin_controls_cache");
      window.dispatchEvent(new Event("admin_controls_refresh"));
      toast.success(`Community Goal ${newValue ? "shown" : "hidden"} for ${field === "visible_for_users" ? "users" : "admin"}`);
    }
    setUpdating(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Settings2 className="w-5 h-5" />
          <h3 className="font-heading font-bold text-lg">Admin Controls</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchControls} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="p-4 bg-card rounded-xl border border-border text-center text-muted-foreground text-sm">
          Loading controls...
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Home UI Controls
          </h4>
          {controls.map((control) => (
            <div
              key={control.id}
              className="p-3 bg-card rounded-xl border border-border flex items-center justify-between"
            >
              <span className="font-medium text-sm">Community Goal UI</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={control.visible_for_users}
                    onCheckedChange={() => toggleControl(control, "visible_for_users")}
                    disabled={updating === control.id}
                  />
                  Users
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={control.visible_for_admin}
                    onCheckedChange={() => toggleControl(control, "visible_for_admin")}
                    disabled={updating === control.id}
                  />
                  Admin
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4 gap-2"
        onClick={() => {
          try {
            localStorage.removeItem("admin_controls_cache");
            window.dispatchEvent(new Event("admin_controls_refresh"));
            toast.success("Flags refreshed!");
          } catch (e) {
            console.error("Failed to clear admin controls cache", e);
            toast.error("Failed to refresh flags");
          }
        }}
      >
        <RefreshCw className="w-4 h-4" />
        Force Refresh Flags
      </Button>
    </motion.div>
  );
};
