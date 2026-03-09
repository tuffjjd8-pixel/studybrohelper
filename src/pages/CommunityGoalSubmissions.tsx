import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Target, Upload, Camera, X, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const MAX_SCREENSHOTS = 3;

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
}

const CommunityGoalSubmissions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select("id, status, message, screenshot_urls, created_at, admin_note, disqualified")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubmissions(
        (data || []).map((s) => ({
          ...s,
          screenshot_urls: Array.isArray(s.screenshot_urls) ? s.screenshot_urls : [],
        }))
      );
    } catch (e) {
      console.error("Error fetching submissions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remaining = MAX_SCREENSHOTS - files.length;
    const toAdd = selected.slice(0, remaining);

    for (const f of toAdd) {
      if (!f.type.startsWith("image/")) {
        toast.error("Only image files allowed");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error("Each image must be under 5 MB");
        return;
      }
    }

    const newFiles = [...files, ...toAdd];
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!user || !goal) return;
    if (files.length === 0 && !message.trim()) {
      toast.error("Add a message or at least one screenshot");
      return;
    }

    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("goal-proofs").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("goal-proofs").getPublicUrl(path);
        urls.push(publicUrl);
      }

      const { error } = await supabase.from("community_goal_submissions").insert({
        user_id: user.id,
        goal_id: goal.id,
        message: message.trim() || null,
        screenshot_urls: urls,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Submission sent for review!");
      setMessage("");
      setFiles([]);
      setPreviews([]);
      fetchSubmissions();
    } catch (e) {
      console.error("Submit error:", e);
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4 text-primary" />;
      case "rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const progressPct = goal ? Math.min(100, (goal.current_count / goal.target_count) * 100) : 0;

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
              Help us reach the goal — submit your proof!
            </p>
          </motion.div>

          {/* Goal progress */}
          {goal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="p-5 bg-card rounded-xl border border-primary/20 space-y-3"
            >
              <h3 className="font-heading font-bold text-primary">{goal.title}</h3>
              <p className="text-xs text-muted-foreground">{goal.body}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.current_count} / {goal.target_count}</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <Progress value={progressPct} className="h-3" />
              </div>
            </motion.div>
          )}

          {/* Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-card rounded-xl border border-primary/20 space-y-3"
          >
            <h3 className="font-heading font-bold text-primary">Rules & Requirements</h3>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>At least <span className="font-semibold text-foreground">100 real views</span></li>
              <li>At least <span className="font-semibold text-foreground">10 real likes</span></li>
              <li>A <span className="font-semibold text-foreground">real, public profile</span> (no AI-generated accounts)</li>
              <li>Screenshot proof of the post, views, and likes</li>
            </ul>
            <p className="text-xs text-destructive font-medium">
              Fake or AI-generated posts will be disqualified. Disqualified users cannot claim rewards.
            </p>
          </motion.div>

          {/* Submission form */}
          {goal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 bg-card rounded-xl border border-primary/20 space-y-4"
            >
              <h3 className="font-heading font-bold text-primary">Submit Your Proof</h3>

              <Textarea
                placeholder="Add a message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background resize-none"
                rows={3}
              />

              {/* Image previews */}
              {previews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {previews.map((url, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-border" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length < MAX_SCREENSHOTS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <Camera className="w-7 h-7 text-primary/60" />
                  <span className="text-sm text-muted-foreground">
                    Add screenshot ({files.length}/{MAX_SCREENSHOTS})
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? (
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
          )}

          {/* Past submissions */}
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
                <div key={sub.id} className="p-3 bg-card rounded-xl border border-border space-y-2">
                  <div className="flex items-center gap-2">
                    {sub.disqualified ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      statusIcon(sub.status)
                    )}
                    <span className={`text-sm font-medium capitalize ${sub.disqualified ? "text-destructive" : sub.status === "approved" ? "text-primary" : sub.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>
                      {sub.disqualified ? "DISQUALIFIED" : sub.status}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {sub.message && <p className="text-xs text-foreground line-clamp-2">{sub.message}</p>}
                  {sub.screenshot_urls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {sub.screenshot_urls.map((url, i) => (
                        <img key={i} src={url} alt={`Proof ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0" />
                      ))}
                    </div>
                  )}
                  {sub.admin_note && (
                    <p className="text-xs text-muted-foreground italic">"{sub.admin_note}"</p>
                  )}
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
