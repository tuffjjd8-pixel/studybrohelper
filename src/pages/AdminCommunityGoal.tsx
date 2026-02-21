import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface Submission {
  id: string;
  user_id: string;
  goal_id: string;
  screenshot_urls: string[];
  status: string;
  downloads_count: number;
  admin_note: string | null;
  disqualified: boolean;
  created_at: string;
  reviewed_at: string | null;
}

const AdminCommunityGoal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, string>>({});

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    fetchSubmissions();
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_goal_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch submissions:", error);
      toast.error("Failed to load submissions");
    } else {
      setSubmissions((data as Submission[]) || []);
    }
    setLoading(false);
  };

  const handleApprove = async (sub: Submission) => {
    const count = parseInt(downloadCounts[sub.id] || "0", 10);
    if (isNaN(count) || count < 0) {
      toast.error("Enter a valid download count");
      return;
    }

    try {
      // Update submission status
      const { error: subErr } = await supabase
        .from("community_goal_submissions")
        .update({
          status: "approved",
          downloads_count: count,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (subErr) throw subErr;

      // Increment community goal current_count
      const { data: goalData } = await supabase
        .from("community_goal_content")
        .select("current_count")
        .eq("id", sub.goal_id)
        .single();

      if (goalData) {
        await supabase
          .from("community_goal_content")
          .update({
            current_count: (goalData as any).current_count + count,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.goal_id);
      }

      toast.success("Submission approved");
      fetchSubmissions();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (sub: Submission) => {
    try {
      const { error } = await supabase
        .from("community_goal_submissions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      toast.success("Submission rejected");
      fetchSubmissions();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Failed to reject");
    }
  };

  const handleDisqualify = async (sub: Submission) => {
    try {
      const { error } = await supabase
        .from("community_goal_submissions")
        .update({
          status: "rejected",
          disqualified: true,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      toast.success("User disqualified from current and future goals");
      fetchSubmissions();
    } catch (err) {
      console.error("Disqualify error:", err);
      toast.error("Failed to disqualify");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/profile")}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </button>

        <h1 className="text-2xl font-heading font-bold mb-6">Community Goal Submissions</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-card rounded-xl border border-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">User: {sub.user_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      sub.status === "approved"
                        ? "bg-primary/10 text-primary"
                        : sub.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sub.disqualified ? "DISQUALIFIED" : sub.status.toUpperCase()}
                  </span>
                </div>

                {/* Screenshots */}
                <div className="flex gap-2 flex-wrap">
                  {sub.screenshot_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Proof ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-border"
                      />
                    </a>
                  ))}
                </div>

                {/* Admin actions for pending submissions */}
                {sub.status === "pending" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Input
                      type="number"
                      placeholder="Downloads"
                      value={downloadCounts[sub.id] || ""}
                      onChange={(e) =>
                        setDownloadCounts((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      className="w-28"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleApprove(sub)}
                      className="gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(sub)}
                      className="gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDisqualify(sub)}
                      className="gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Disqualify
                    </Button>
                  </div>
                )}

                {sub.status === "approved" && (
                  <p className="text-xs text-muted-foreground">
                    Downloads counted: {sub.downloads_count}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommunityGoal;
