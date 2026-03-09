import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

interface Submission {
  id: string;
  user_id: string;
  goal_id: string;
  screenshot_urls: string[];
  status: string;
  created_at: string;
  admin_note: string | null;
  downloads_count: number;
  disqualified: boolean;
  display_name?: string;
}

const CommunityGoalSubmissions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) fetchSubmissions();
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_goal_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withProof = (data || []).filter((s) => s.screenshot_urls?.length > 0);

      const userIds = [...new Set(withProof.map((s) => s.user_id))];
      let profileMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        profiles?.forEach((p) => {
          profileMap[p.user_id] = p.display_name || "Unknown User";
        });
      }

      setSubmissions(
        withProof.map((s) => ({
          ...s,
          display_name: profileMap[s.user_id] || "Unknown User",
        }))
      );
    } catch (e) {
      console.error("Failed to fetch submissions:", e);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, goalId: string, action: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("community_goal_submissions")
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      if (action === "approved") {
        const { error: goalError } = await supabase.rpc("increment_community_goal" as any, { goal_id_param: goalId });
        if (goalError) {
          const { data: goal } = await supabase
            .from("community_goal_content")
            .select("current_count")
            .eq("id", goalId)
            .single();

          if (goal) {
            await supabase
              .from("community_goal_content")
              .update({ current_count: goal.current_count + 1 })
              .eq("id", goalId);
          }
        }
      }

      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: action } : s))
      );
      // Update selected sub status in modal too
      setSelectedSub((prev) => (prev && prev.id === id ? { ...prev, status: action } : prev));
      toast.success(`Submission ${action}`);
    } catch (e) {
      console.error(`Failed to ${action} submission:`, e);
      toast.error(`Failed to ${action} submission`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.status === filter);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Community Goal Submissions</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
            {f !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({submissions.filter((s) => s.status === f).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card rounded-xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No {filter === "all" ? "" : filter} submissions found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="bg-card rounded-xl border border-border p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedSub(sub)}
            >
              {/* User & time */}
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{sub.display_name}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                    sub.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : sub.status === "approved"
                      ? "bg-primary/20 text-primary"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {sub.status}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {format(new Date(sub.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>

              {/* Screenshot thumbnail */}
              {sub.screenshot_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {sub.screenshot_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Proof ${i + 1}`}
                      className="w-32 h-32 object-cover rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}

              {/* Quick actions for pending */}
              {sub.status === "pending" && (
                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    onClick={() => handleAction(sub.id, sub.goal_id, "approved")}
                    disabled={actionLoading === sub.id}
                    className="flex-1 gap-1"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(sub.id, sub.goal_id, "rejected")}
                    disabled={actionLoading === sub.id}
                    className="flex-1 gap-1"
                  >
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedSub} onOpenChange={(open) => { if (!open) setSelectedSub(null); }}>
        <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedSub?.display_name}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  selectedSub?.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-500"
                    : selectedSub?.status === "approved"
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {selectedSub?.status}
              </span>
            </DialogTitle>
            {selectedSub && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(selectedSub.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </DialogHeader>

          {/* Screenshots full view */}
          {selectedSub && selectedSub.screenshot_urls.length > 0 && (
            <div className="overflow-x-auto flex gap-3 px-5 pb-3">
              {selectedSub.screenshot_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <img
                    src={url}
                    alt={`Proof ${i + 1}`}
                    className="w-full max-w-sm rounded-xl border border-border object-contain max-h-72"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Actions */}
          {selectedSub?.status === "pending" && (
            <div className="flex gap-3 px-5 pb-5 pt-2">
              <Button
                className="flex-1 gap-1"
                onClick={() => handleAction(selectedSub.id, selectedSub.goal_id, "approved")}
                disabled={actionLoading === selectedSub.id}
              >
                <Check className="w-4 h-4" /> Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-1"
                onClick={() => handleAction(selectedSub.id, selectedSub.goal_id, "rejected")}
                disabled={actionLoading === selectedSub.id}
              >
                <X className="w-4 h-4" /> Reject
              </Button>
            </div>
          )}

          {selectedSub?.status !== "pending" && <div className="pb-5" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityGoalSubmissions;
