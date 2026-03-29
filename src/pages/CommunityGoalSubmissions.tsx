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
import { Camera, Upload, Target, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface GoalContent {
  id: string;
  title: string;
  body: string;
  current_count: number;
  target_count: number;
  visible: boolean;
}

interface UserSubmission {
  id: string;
  status: string;
  message: string | null;
  screenshot_urls: string[];
  created_at: string;
  admin_note: string | null;
  disqualified: boolean;
  downloads_count: number;
}

const CommunityGoalSubmissions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [likesClaimed, setLikesClaimed] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalConfirmed, setTotalConfirmed] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGoal();
      fetchSubmissions();
    }
  }, [user]);

  const fetchGoal = async () => {
    const { data } = await supabase
      .from("community_goal_content")
      .select("*")
      .eq("visible", true)
      .limit(1)
      .maybeSingle();
    if (data) setGoal(data);
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("community_goal_submissions")
        .select("id, status, message, screenshot_urls, created_at, admin_note, disqualified, downloads_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((s) => ({
        ...s,
        screenshot_urls: Array.isArray(s.screenshot_urls) ? s.screenshot_urls : [],
      }));
      setSubmissions(mapped);
      const total = mapped.reduce((sum, s) => sum + (s.status === "approved" ? (s.downloads_count || 0) : 0), 0);
      setTotalConfirmed(total);
    } catch (e) {
      console.error("Error fetching submissions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user || !goal) return;
    const claimedNum = parseInt(likesClaimed);
    if (isNaN(claimedNum) || claimedNum < 1) {
      toast.error("Enter a valid number of likes");
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("goal-proofs")
        .upload(path, selectedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("goal-proofs")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("community_goal_submissions")
        .insert({
          user_id: user.id,
          goal_id: goal.id,
          message: `Likes claimed: ${claimedNum}`,
          screenshot_urls: [publicUrl],
          status: "pending",
          downloads_count: claimedNum,
        });
      if (insertError) throw insertError;

      toast.success("Screenshot submitted for review!");
      setSelectedFile(null);
      setPreviewUrl(null);
      setLikesClaimed("");
      fetchSubmissions();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to submit screenshot");
    } finally {
      setUploading(false);
    }
  };

  const statusIcon = (sub: UserSubmission) => {
    if (sub.disqualified) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    switch (sub.status) {
      case "approved": return <CheckCircle className="w-5 h-5 text-primary" />;
      case "rejected": return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <Clock className="w-5 h-5 text-primary/60" />;
    }
  };

  const statusLabel = (sub: UserSubmission) => {
    if (sub.disqualified) return "DISQUALIFIED";
    return sub.status;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Community Goal Submissions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Share StudyBro, screenshot your likes, and earn rewards!
            </p>
          </motion.div>

          {/* Confirmed likes counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-card rounded-xl border border-primary/20 text-center"
          >
            <Target className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-3xl font-bold text-primary">{totalConfirmed}</div>
            <div className="text-xs text-muted-foreground">Confirmed Likes</div>
          </motion.div>

          {/* Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="p-5 bg-card rounded-xl border border-primary/20 space-y-3"
          >
            <h3 className="font-heading font-bold text-primary">Rules & Requirements</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To be counted, your post must have:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>At least <span className="font-semibold text-foreground">100 real views</span></li>
              <li>At least <span className="font-semibold text-foreground">10 real likes</span></li>
              <li>A <span className="font-semibold text-foreground">real, public profile</span> (no AI-generated accounts)</li>
              <li>Screenshot proof of the post, views, and likes</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              Fake or AI-generated posts will be disqualified.
            </p>
            <p className="text-xs text-destructive font-medium mt-1">
              Disqualified users cannot claim rewards or join the next community goal.
            </p>
          </motion.div>

          {/* Upload form */}
          {goal ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 bg-card rounded-xl border border-primary/20 space-y-4"
            >
              <h3 className="font-heading font-bold text-primary">Submit Proof Screenshot</h3>
              <p className="text-xs text-muted-foreground">
                Share a post about StudyBro, then screenshot the likes and submit here.
              </p>

              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full rounded-lg max-h-48 object-cover" />
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center text-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-primary/60" />
                  <span className="text-sm text-muted-foreground">Tap to upload screenshot</span>
                </button>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Likes shown in screenshot</label>
                <Input
                  type="number"
                  min="1"
                  value={likesClaimed}
                  onChange={(e) => setLikesClaimed(e.target.value)}
                  placeholder="e.g. 25"
                  className="bg-background"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || !likesClaimed || uploading}
                className="w-full"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Submit for Review
                  </div>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 bg-card rounded-xl border border-border text-center text-sm text-muted-foreground"
            >
              No active community goal right now. Check back soon!
            </motion.div>
          )}

          {/* Submissions history */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-heading font-bold">Your Submissions</h3>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="p-3 bg-card rounded-xl border border-border flex gap-3 items-start">
                  {sub.screenshot_urls[0] && (
                    <img src={sub.screenshot_urls[0]} alt="Screenshot" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {statusIcon(sub)}
                      <span className={`text-sm font-medium capitalize ${sub.disqualified || sub.status === "rejected" ? "text-destructive" : sub.status === "approved" ? "text-primary" : "text-muted-foreground"}`}>
                        {statusLabel(sub)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Claimed: {sub.downloads_count} • Confirmed: {sub.status === "approved" ? sub.downloads_count : 0}
                    </div>
                    {sub.admin_note && (
                      <div className="text-xs text-muted-foreground mt-1 italic">"{sub.admin_note}"</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default CommunityGoalSubmissions;
