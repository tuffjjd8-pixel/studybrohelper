import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Flame,
  Trophy,
  LogOut,
  Copy,
  Crown,
  Calendar,
  Target,
} from "lucide-react";

interface Profile {
  id: string;
  display_name: string | null;
  streak_count: number;
  total_solves: number;
  is_premium: boolean;
  daily_solves_used: number;
  referral_code: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", user?.id);

      if (error) throw error;
      toast.success("Name updated!");
      setProfile((prev) => prev ? { ...prev, display_name: displayName.trim() } : null);
    } catch (error) {
      toast.error("Failed to update name");
    } finally {
      setIsSaving(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(`https://studybro.ai?ref=${profile.referral_code}`);
      toast.success("Referral link copied!");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("Signed out. See you later, bro! 👋");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header streak={profile?.streak_count || 0} totalSolves={profile?.total_solves || 0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile header */}
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-heading font-bold">
                {profile?.display_name || "Study Bro"}
              </h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              {profile?.is_premium && (
                <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                  <Crown className="w-4 h-4" />
                  Premium Bro
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-card rounded-xl border border-border text-center"
              >
                <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{profile?.streak_count || 0}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="p-4 bg-card rounded-xl border border-border text-center"
              >
                <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{profile?.total_solves || 0}</div>
                <div className="text-xs text-muted-foreground">Problems Solved</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-card rounded-xl border border-border text-center"
              >
                <Target className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {profile?.is_premium ? "∞" : `${10 - (profile?.daily_solves_used || 0)}`}
                </div>
                <div className="text-xs text-muted-foreground">Solves Left Today</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="p-4 bg-card rounded-xl border border-border text-center"
              >
                <Calendar className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {profile?.created_at
                    ? Math.floor(
                        (Date.now() - new Date(profile.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0}
                </div>
                <div className="text-xs text-muted-foreground">Days as Member</div>
              </motion.div>
            </div>

            {/* Edit name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-card rounded-xl border border-border"
            >
              <label className="text-sm text-muted-foreground mb-2 block">
                Display Name
              </label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-background"
                />
                <Button
                  onClick={handleUpdateName}
                  disabled={isSaving || displayName === profile?.display_name}
                >
                  {isSaving ? "..." : "Save"}
                </Button>
              </div>
            </motion.div>

            {/* Referral */}
            {profile?.referral_code && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20"
              >
                <h3 className="font-medium mb-2">Invite Friends</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Share your code and both get a free premium day!
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`studybro.ai?ref=${profile.referral_code}`}
                    className="bg-background text-sm"
                  />
                  <Button variant="outline" onClick={copyReferralCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Premium upsell */}
            {!profile?.is_premium && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl border border-primary/30 text-center"
              >
                <Crown className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg mb-2">
                  Go Premium, Bro!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Unlimited solves, no ads, priority voice mode
                </p>
                <Button onClick={() => navigate("/premium")} className="w-full">
                  Upgrade for $4.99/month
                </Button>
              </motion.div>
            )}

            {/* Sign out */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
