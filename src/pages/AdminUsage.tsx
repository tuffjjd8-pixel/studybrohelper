import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, DollarSign, BarChart3, Users, Zap } from "lucide-react";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface UsageStats {
  daily: {
    usage: Record<string, number>;
    totalRequests: number;
    cost: { total: number; byType: Record<string, number> };
  };
  monthly: {
    usage: Record<string, number>;
    totalRequests: number;
    cost: {
      total: number;
      projected: number;
      per1000Requests: number;
      perActiveUser: number;
      byType: Record<string, number>;
    };
    uniqueActiveUsers: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  perUser: Array<{
    user_id: string;
    device_id: string;
    display_name: string;
    solve: number;
    follow_up: number;
    humanize: number;
    quiz: number;
    transcribe: number;
    is_premium: boolean;
  }>;
  date: string;
}

const TYPES = ["solve", "follow_up", "humanize", "quiz", "transcribe"];

export default function AdminUsage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAdmin, navigate]);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-usage-stats");
      if (fnError) throw fnError;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin]);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="ml-auto">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {stats && (
        <div className="space-y-6">
          {/* Date */}
          <p className="text-xs text-muted-foreground">Data for: {stats.date} (CST)</p>

          {/* Daily Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Daily Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <div key={t} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">{t.replace("_", " ")}</p>
                    <p className="text-2xl font-bold">{stats.daily.usage[t] || 0}</p>
                  </div>
                ))}
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-primary">Total</p>
                  <p className="text-2xl font-bold text-primary">{stats.daily.totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <div key={t} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">{t.replace("_", " ")}</p>
                    <p className="text-2xl font-bold">{stats.monthly.usage[t] || 0}</p>
                  </div>
                ))}
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-primary">Total</p>
                  <p className="text-2xl font-bold text-primary">{stats.monthly.totalRequests}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.monthly.uniqueActiveUsers} active users · Day {stats.monthly.daysElapsed}/{stats.monthly.daysInMonth}
              </p>
            </CardContent>
          </Card>

          {/* Groq Cost — Daily */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Daily Groq Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <div key={t} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">{t.replace("_", " ")}</p>
                    <p className="text-lg font-mono font-bold">${(stats.daily.cost.byType[t] || 0).toFixed(4)}</p>
                  </div>
                ))}
                <div className="bg-green-500/10 rounded-lg p-3">
                  <p className="text-xs text-green-600">Total Daily</p>
                  <p className="text-lg font-mono font-bold text-green-600">${stats.daily.cost.total.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Groq Cost — Monthly */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Monthly Groq Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total So Far</p>
                  <p className="text-xl font-mono font-bold">${stats.monthly.cost.total.toFixed(4)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Projected EOM</p>
                  <p className="text-xl font-mono font-bold">${stats.monthly.cost.projected.toFixed(4)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Cost / 1K Requests</p>
                  <p className="text-xl font-mono font-bold">${stats.monthly.cost.per1000Requests.toFixed(4)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Cost / Active User</p>
                  <p className="text-xl font-mono font-bold">${stats.monthly.cost.perActiveUser.toFixed(4)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TYPES.map(t => (
                  <div key={t} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">{t.replace("_", " ")}</p>
                    <p className="text-lg font-mono font-bold">${(stats.monthly.cost.byType[t] || 0).toFixed(4)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-User Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Per-User Breakdown (Today)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Solves</TableHead>
                      <TableHead className="text-xs">Follow-ups</TableHead>
                      <TableHead className="text-xs">Humanize</TableHead>
                      <TableHead className="text-xs">Quiz</TableHead>
                      <TableHead className="text-xs">Premium</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.perUser.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                          No usage data today
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.perUser.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">
                            {u.display_name || (u.user_id ? u.user_id.slice(0, 8) + "..." : u.device_id?.slice(0, 8) + "..." || "anon")}
                          </TableCell>
                          <TableCell className="text-xs">{u.solve}</TableCell>
                          <TableCell className="text-xs">{u.follow_up}</TableCell>
                          <TableCell className="text-xs">{u.humanize}</TableCell>
                          <TableCell className="text-xs">{u.quiz}</TableCell>
                          <TableCell className="text-xs">{u.is_premium ? "✅" : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
