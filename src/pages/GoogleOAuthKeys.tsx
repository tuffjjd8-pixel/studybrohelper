import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Key, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GoogleOAuthKeys = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter both Client ID and Client Secret.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Call edge function to store secrets securely
      const { error } = await supabase.functions.invoke("store-google-oauth", {
        body: { clientId: clientId.trim(), clientSecret: clientSecret.trim() },
      });

      if (error) throw error;

      setSaved(true);
      toast({
        title: "Google OAuth keys saved.",
        description: "Your keys have been stored securely.",
      });

      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving Google OAuth keys:", error);
      toast({
        title: "Error saving keys",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
                <h1 className="text-2xl font-heading font-bold">Google OAuth Keys</h1>
                <p className="text-sm text-muted-foreground">
                  Configure your Google OAuth credentials
                </p>
              </div>
            </div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Secure Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    Your OAuth keys are encrypted and stored securely. They are never exposed in client-side code.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Input Fields */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium">Google Client ID</label>
                <div className="relative">
                  <Input
                    type={showClientId ? "text" : "password"}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your Google Client ID"
                    className="pr-10 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientId(!showClientId)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showClientId ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium">Google Client Secret</label>
                <div className="relative">
                  <Input
                    type={showClientSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter your Google Client Secret"
                    className="pr-10 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showClientSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={handleSave}
                disabled={isSaving || !clientId.trim() || !clientSecret.trim()}
                className="w-full gap-2"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : isSaving ? (
                  "Saving..."
                ) : (
                  "Save"
                )}
              </Button>
            </motion.div>

            {/* Success Message */}
            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center"
              >
                <p className="text-sm font-medium text-primary">
                  Google OAuth keys saved.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default GoogleOAuthKeys;
