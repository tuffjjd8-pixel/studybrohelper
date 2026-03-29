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
import { CheckCircle, XCircle, Clock, ArrowLeft, Heart, Eye } from "lucide-react";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface Submission {
  id: string;
  user_id: string;
  screenshot_url: string;
  likes_claimed: number;
  likes_confirmed: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const AdminShareLikes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmedInput, setConfirmedInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/profile");
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchSubmissions();
  }, [isAdmin, filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("share_likes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sub: Submission) => {
    const confirmed = parseInt(confirmedInput);
    if (isNaN(confirmed) || confirmed < 0) {
      toast.error("Enter a valid confirmed likes number");
      return;
    }

    try {
      const { error } = await supabase
        .from("share_likes")
        .update({
          status: "approved",
          likes_confirmed: confirmed,
          admin_note: noteInput || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (error) throw error;
      toast.success("Submission approved!");
      setEditingId(null);
      setConfirmedInput("");
      setNoteInput("");
      fetchSubmissions();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (sub: Submission) => {
    try {
      const { error } = await supabase
        .from("share_likes")
        .update({
          status: "rejected",
          admin_note: noteInput || "Rejected by admin",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (error) throw error;
      toast.success("Submission rejected");
      setEditingId(null);
      setNoteInput("");
      fetchSubmissions();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  if (authLoading || !isAdmin) {
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
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Share Likes Admin</h1>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No {filter} submissions</div>
          ) : (
            submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-card rounded-xl border border-border space-y-3"
              >
                <div className="flex gap-3">
                  <button onClick={() => setPreviewImage(sub.screenshot_url)} className="relative flex-shrink-0">
                    <img src={sub.screenshot_url} alt="Screenshot" className="w-20 h-20 rounded-lg object-cover" />
                    <div className="absolute inset-0 bg-background/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Eye className="w-5 h-5" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {sub.status === "approved" && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {sub.status === "rejected" && <XCircle className="w-4 h-4 text-destructive" />}
                      {sub.status === "pending" && <Clock className="w-4 h-4 text-yellow-500" />}
                      <span className="text-sm font-medium capitalize">{sub.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Claimed: <span className="font-bold text-foreground">{sub.likes_claimed}</span>
                      {sub.likes_confirmed > 0 && (
                        <> • Confirmed: <span className="font-bold text-green-500">{sub.likes_confirmed}</span></>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      User: {sub.user_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions for pending */}
                {sub.status === "pending" && editingId !== sub.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(sub.id);
                      setConfirmedInput(String(sub.likes_claimed));
                      setNoteInput("");
                    }}
                    className="w-full"
                  >
                    Review
                  </Button>
                )}

                {editingId === sub.id && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div>
                      <label className="text-xs text-muted-foreground">Confirmed likes</label>
                      <Input
                        type="number"
                        min="0"
                        value={confirmedInput}
                        onChange={(e) => setConfirmedInput(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Note (optional)</label>
                      <Input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Optional note"
                        className="bg-background"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(sub)} className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(sub)} className="flex-1">
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>
      <BottomNav />

      {/* Full image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Full preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default AdminShareLikes;
