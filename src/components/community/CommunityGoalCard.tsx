import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface GoalContent {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  visible: boolean;
  current_count: number;
  target_count: number;
}

const PARTICIPATION_KEY = "community_goal_participation";

interface CommunityGoalCardProps {
  onParticipationChange?: (participating: boolean | null) => void;
}

export function CommunityGoalCard({ onParticipationChange }: CommunityGoalCardProps) {
  const { user } = useAuth();
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [participate, setParticipate] = useState<boolean | null>(() => {
    const saved = localStorage.getItem(PARTICIPATION_KEY);
    if (saved === null) return null;
    return saved === "true";
  });
  const [uploading, setUploading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGoal = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("id, title, body, image_url, visible, current_count, target_count")
        .eq("visible", true)
        .limit(1)
        .maybeSingle();

      if (data) setGoal(data as GoalContent);
    };
    fetchGoal();
  }, []);

  // Fetch user's submission status
  useEffect(() => {
    if (!user || !goal) return;
    const fetchSubmission = async () => {
      const { data } = await supabase
        .from("community_goal_submissions")
        .select("status")
        .eq("user_id", user.id)
        .eq("goal_id", goal.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSubmissionStatus(data.status);
    };
    fetchSubmission();
  }, [user, goal]);

  const handleParticipationChange = (value: boolean) => {
    setParticipate(value);
    localStorage.setItem(PARTICIPATION_KEY, String(value));
    onParticipationChange?.(value);
  };

  // Notify parent of initial state
  useEffect(() => {
    onParticipationChange?.(participate);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !goal) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error("Only images are allowed");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Max 5MB per image");
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${goal.id}-${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("goal-proofs")
          .upload(path, file);
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from("goal-proofs")
          .getPublicUrl(path);
        urls.push(publicUrl);
      }

      if (urls.length === 0) {
        setUploading(false);
        return;
      }

      const { error } = await supabase
        .from("community_goal_submissions")
        .insert({
          user_id: user.id,
          goal_id: goal.id,
          screenshot_urls: urls,
          status: "pending",
        });

      if (error) throw error;
      setSubmissionStatus("pending");
      toast.success("Proof uploaded! Pending admin review.");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload proof");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!goal) return null;
  if (participate === false) return null;

  const progressPercent = goal.target_count > 0
    ? Math.min(100, Math.round((goal.current_count / goal.target_count) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{goal.title}</p>
        {goal.image_url && (
          <img src={goal.image_url} alt="Goal" className="rounded-lg max-h-32 object-cover mx-auto" />
        )}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {goal.body}
        </p>

        {/* Progress bar - only show when participating */}
        {participate === true && (
          <div className="pt-2 space-y-1">
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {goal.current_count} / {goal.target_count} approved
            </p>
          </div>
        )}

        {/* Participation selector - show when no choice made */}
        {participate === null && (
          <div className="pt-2 border-t border-primary/10">
            <p className="text-xs text-muted-foreground mb-1.5">Participate in this Community Goal?</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleParticipationChange(true)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Yes
              </button>
              <button
                onClick={() => handleParticipationChange(false)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Rules section */}
        {participate === true && (
          <div className="pt-2 border-t border-primary/10 text-left">
            <p className="text-xs font-medium text-foreground mb-1">Rules:</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To be counted, your post must have:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5 mt-1">
              <li>At least 100 real views</li>
              <li>At least 10 real likes</li>
              <li>A real, public profile (no AI-generated accounts)</li>
              <li>Screenshot proof of the post, views, and likes</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              Fake or AI-generated posts will be disqualified.
            </p>
            <p className="text-xs text-destructive mt-0.5">
              Fake views = banned from discounts and future community goals.
            </p>
          </div>
        )}

        {/* Upload proof section */}
        {participate === true && user && (
          <div className="pt-2 border-t border-primary/10">
            {submissionStatus === "pending" && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Proof submitted — pending review</span>
              </div>
            )}
            {submissionStatus === "approved" && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approved!</span>
              </div>
            )}
            {submissionStatus === "rejected" && (
              <p className="text-xs text-destructive">Your submission was rejected.</p>
            )}
            {!submissionStatus && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Uploading..." : "Upload Proof Screenshots"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
