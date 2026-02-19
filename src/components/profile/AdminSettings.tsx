import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, CreditCard, BarChart3 } from "lucide-react";
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

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchStripeMode();
    }
  }, [isAdmin]);

  const fetchStripeMode = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_mode")
        .single();

      if (error) throw error;
      setStripeMode(data?.value as "test" | "live" || "live");
    } catch (error) {
      console.error("Error fetching stripe mode:", error);
    } finally {
      setIsLoading(false);
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

      {/* Poll Management Button */}
      <Button
        variant="outline"
        onClick={() => navigate("/polls")}
        className="w-full justify-start gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Manage Polls
      </Button>

      {/* Usage Dashboard Button */}
      <Button
        variant="outline"
        onClick={() => navigate("/admin/usage")}
        className="w-full justify-start gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Usage &amp; Cost Dashboard
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
