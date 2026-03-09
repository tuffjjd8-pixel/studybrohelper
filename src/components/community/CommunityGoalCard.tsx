import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Check if user already submitted for this goal
  useEffect(() => {
    if (!user || !goal) return;
    const checkExisting = async () => {
      const { data } = await supabase
        .from("community_goal_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("goal_id", goal.id)
        .limit(1)
        .maybeSingle();
      if (data) setHasSubmitted(true);
    };
    checkExisting();
  }, [user, goal]);

  const handleParticipationChange = (value: boolean) => {
    setParticipate(value);
    localStorage.setItem(PARTICIPATION_KEY, String(value));
    onParticipationChange?.(value);
  };

  useEffect(() => {
    onParticipationChange?.(participate);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Some files were skipped (images under 10MB only)");
    }

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 3));

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewUrls((prev) => [...prev, ev.target?.result as string].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !goal) {
      toast.error("You must be logged in to submit");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please upload at least one screenshot");
      return;
    }

    setSubmitting(true);
    try {
      // Upload screenshots to goal-proofs bucket
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${goal.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("goal-proofs")
          .upload(path, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("goal-proofs")
          .getPublicUrl(path);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert submission row
      const { error: insertError } = await supabase
        .from("community_goal_submissions")
        .insert({
          user_id: user.id,
          goal_id: goal.id,
          screenshot_urls: uploadedUrls,
          message: message.trim(),
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Proof submitted! An admin will review it soon.");
      setHasSubmitted(true);
      setShowSubmitForm(false);
      setMessage("");
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit proof");
    } finally {
      setSubmitting(false);
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

        {/* Progress bar */}
        {participate === true && (
          <div className="pt-2 space-y-1">
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {goal.current_count} / {goal.target_count} approved
            </p>
          </div>
        )}

        {/* Submit proof section */}
        {participate === true && user && !hasSubmitted && !showSubmitForm && (
          <Button
            size="sm"
            onClick={() => setShowSubmitForm(true)}
            className="mt-2 gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> Submit Proof
          </Button>
        )}

        {participate === true && hasSubmitted && (
          <p className="text-xs text-primary font-medium mt-2">✓ Proof submitted — awaiting review</p>
        )}

        {/* Submit form */}
        {showSubmitForm && (
          <div className="pt-3 border-t border-primary/10 space-y-3 text-left">
            <Textarea
              placeholder="Describe your contribution (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
              maxLength={500}
            />

            {/* File previews */}
            {previewUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Preview ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-border" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex gap-2">
              {selectedFiles.length < 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Add Screenshot
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || selectedFiles.length === 0}
                className="gap-1 ml-auto"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit
              </Button>
            </div>

            <button
              onClick={() => { setShowSubmitForm(false); setSelectedFiles([]); setPreviewUrls([]); setMessage(""); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Participation selector */}
        {participate === null && (
          <div className="pt-2 border-t border-primary/10">
            <p className="text-xs text-muted-foreground mb-1.5">Participate in this Community Goal?</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleParticipationChange(true)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/80"
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
      </div>
    </motion.div>
  );
}
