import { useState, useEffect, useRef } from "react";
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
  Camera,
  Sparkles,
  Mic,
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
  avatar_url: string | null;
  animated_steps_used_today: number;
  speech_clips_used: number;
  last_speech_reset: string | null;
}

// Speech clips reset every 72 hours
const FREE_SPEECH_CLIPS = 3;
const PREMIUM_SPEECH_CLIPS = 10;
const SPEECH_RESET_HOURS = 72;
const FREE_ANIMATED_STEPS_PER_DAY = 5;
const PREMIUM_ANIMATED_STEPS_PER_DAY = 16;

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No redirect - profile is accessible, but shows sign-in prompt for guests

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Guest profile view
  if (!user) {
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
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
                  <User className="w-10 h-10 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-heading font-bold mt-4">Guest User</h1>
                <p className="text-muted-foreground text-sm mt-2">
                  Sign in to sync your progress across devices
                </p>
              </div>

              {/* Stats grid for guest - using localStorage */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-card rounded-xl border border-border text-center"
                >
                  <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 bg-card rounded-xl border border-border text-center"
                >
                  <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {JSON.parse(localStorage.getItem("guest_solves") || "[]").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Problems Solved</div>
                </motion.div>
              </div>

              {/* Sign in prompt */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl border border-primary/30 text-center"
              >
                <User className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg mb-2">
                  Sign in to unlock more
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sync your progress, track streaks, and access your history anywhere
                </p>
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Sign In (Optional)
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const maxSpeechClips = profile?.is_premium ? PREMIUM_SPEECH_CLIPS : FREE_SPEECH_CLIPS;
  const maxAnimatedSteps = profile?.is_premium ? PREMIUM_ANIMATED_STEPS_PER_DAY : FREE_ANIMATED_STEPS_PER_DAY;
  const animatedStepsUsed = profile?.animated_steps_used_today || 0;
  
  // Calculate speech clips with 72h reset logic
  const getSpeechClipsRemaining = () => {
    if (!profile) return maxSpeechClips;
    const lastReset = profile.last_speech_reset ? new Date(profile.last_speech_reset) : null;
    if (!lastReset) return maxSpeechClips;
    
    const hoursSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= SPEECH_RESET_HOURS) {
      return maxSpeechClips; // Reset happened
    }
    return Math.max(0, maxSpeechClips - (profile.speech_clips_used || 0));
  };
  
  const speechClipsRemaining = getSpeechClipsRemaining();
  const hoursUntilReset = () => {
    if (!profile?.last_speech_reset) return 0;
    const lastReset = new Date(profile.last_speech_reset);
    const resetTime = new Date(lastReset.getTime() + SPEECH_RESET_HOURS * 60 * 60 * 1000);
    const hours = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60)));
    return hours;
  };

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
            {/* Profile header with avatar */}
            <div className="text-center py-6">
              <div className="relative inline-block">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <User className="w-10 h-10 text-primary-foreground" />
                  </div>
                )}
                
                {/* Upload button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary/80 transition-colors"
                >
                  {isUploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              
              <h1 className="text-2xl font-heading font-bold mt-4">
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
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{animatedStepsUsed}/{maxAnimatedSteps}</div>
                <div className="text-xs text-muted-foreground">Animated Steps Today</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="p-4 bg-card rounded-xl border border-border text-center"
              >
                <Mic className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold">{speechClipsRemaining}/{maxSpeechClips}</div>
                <div className="text-xs text-muted-foreground">Speech Clips Left</div>
                {speechClipsRemaining === 0 && (
                  <div className="text-xs text-orange-500 mt-1">Resets in {hoursUntilReset()}h</div>
                )}
              </motion.div>
            </div>

            {/* Member since */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-card rounded-xl border border-border flex items-center gap-4"
            >
              <Calendar className="w-8 h-8 text-violet-500" />
              <div>
                <div className="text-lg font-bold">
                  {profile?.created_at
                    ? Math.floor(
                        (Date.now() - new Date(profile.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0} days
                </div>
                <div className="text-xs text-muted-foreground">Member since joining</div>
              </div>
            </motion.div>

            {/* Edit name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
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
                transition={{ delay: 0.4 }}
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
                transition={{ delay: 0.45 }}
                className="p-6 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl border border-primary/30 text-center"
              >
                <Crown className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg mb-2">
                  Go Premium, Bro!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  16 animated steps, 10 speech clips/72h, enhanced solving
                </p>
                <Button onClick={() => navigate("/premium")} className="w-full">
                  Upgrade for $5.99/month
                </Button>
              </motion.div>
            )}

            {/* Sign out */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
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
