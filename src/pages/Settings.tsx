import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, Bell, Moon, Shield, HelpCircle } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const settingsItems = [
    { icon: Bell, label: "Notifications", description: "Manage notification preferences" },
    { icon: Moon, label: "Appearance", description: "Dark mode, theme settings" },
    { icon: Shield, label: "Privacy", description: "Data and privacy settings" },
    { icon: HelpCircle, label: "Help & Support", description: "FAQs and contact support" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

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

            {/* Settings list */}
            <div className="space-y-3">
              {settingsItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
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
              transition={{ delay: 0.4 }}
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
