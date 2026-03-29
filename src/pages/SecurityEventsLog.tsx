import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Trash2, Ban, Clock } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_message: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const SecurityEventsLog = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchEvents();
    } else if (!authLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [authLoading, isAdmin]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents((data as SecurityEvent[]) || []);
    } catch (error) {
      console.error("Error fetching security events:", error);
      toast.error("Failed to load security events");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("security_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleModerate = async (userId: string | null, action: "ban" | "limit") => {
    if (!userId) {
      toast.error("No user ID associated with this event");
      return;
    }

    setActionLoading(`${action}-${userId}`);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke("moderate-user", {
        body: { action, target_user_id: userId, duration_hours: 24 },
      });

      if (res.error) throw res.error;

      toast.success(
        action === "ban"
          ? "User has been banned."
          : "User has been temporarily limited."
      );
    } catch (error) {
      console.error(`${action} error:`, error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "high": return "text-red-500 bg-red-500/10";
      case "medium": return "text-orange-500 bg-orange-500/10";
      default: return "text-yellow-500 bg-yellow-500/10";
    }
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
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate("/profile")}
              className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-heading font-bold">Security Events Log</h1>
            </div>

            {events.length === 0 ? (
              <div className="p-8 bg-card rounded-xl border border-border text-center text-muted-foreground">
                No security events recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Severity</th>
                      <th className="py-3 px-3">User Message</th>
                      <th className="py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-sm font-medium">{event.event_type}</td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${severityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm max-w-xs truncate">
                          {event.user_message || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleModerate(event.user_id, "limit")}
                              disabled={!event.user_id || actionLoading === `limit-${event.user_id}`}
                              className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Limit user for 24 hours"
                            >
                              <Clock className="w-3 h-3" />
                              Limit
                            </button>
                            <button
                              onClick={() => handleModerate(event.user_id, "ban")}
                              disabled={!event.user_id || actionLoading === `ban-${event.user_id}`}
                              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Ban user permanently"
                            >
                              <Ban className="w-3 h-3" />
                              Ban
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SecurityEventsLog;
