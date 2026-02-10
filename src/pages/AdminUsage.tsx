import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, DollarSign, Users, Activity, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface UsageStats {
  today: string;
  daily: {
    byType: Record<string, number>;
    totalRequests: number;
    cost: Record<string, number>;
    totalCost: number;
  };
  monthly: {
    byType: Record<string, number>;
    totalRequests: number;
    cost: Record<string, number>;
    totalCost: number;
    projectedCost: number;
    costPer1K: number;
    costPerActiveUser: number;
    activeUsers: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  perUser: Array<{
    key: string;
    userId: string | null;
    deviceId: string | null;
    solves: number;
    followUps: number;
    humanize: number;
    quizzes: number;
    transcribe: number;
    totalCost: number;
    isPremium: boolean;
  }>;
}

const FEATURE_LABELS: Record<string, string> = {
  solve: "Solves",
  "follow-up": "Follow-ups",
  humanize: "Humanize",
  quiz: "Quizzes",
  transcribe: "Transcribe",
};

export default function AdminUsage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke("admin-usage-stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (fnError) throw fnError;
      setStats(data);
    } catch (e: any) {
      setError(e.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="w-64 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Usage & Cost Dashboard</h1>
        <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading} className="ml-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
      )}

      {loading && !stats ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Date */}
          <p className="text-sm text-muted-foreground">Today: {stats.today}</p>

          {/* Daily Usage Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Daily Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{stats.daily.byType[key] || 0}</p>
                  </div>
                ))}
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">{stats.daily.totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Usage Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{stats.monthly.byType[key] || 0}</p>
                  </div>
                ))}
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">{stats.monthly.totalRequests}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                <span>Active users: <strong className="text-foreground">{stats.monthly.activeUsers}</strong></span>
                <span>Days: {stats.monthly.daysElapsed}/{stats.monthly.daysInMonth}</span>
              </div>
            </CardContent>
          </Card>

          {/* Daily Groq Cost */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" /> Daily Groq Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">${(stats.daily.cost[key] || 0).toFixed(4)}</p>
                  </div>
                ))}
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-500">${stats.daily.totalCost.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Groq Cost */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" /> Monthly Groq Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">${(stats.monthly.cost[key] || 0).toFixed(4)}</p>
                  </div>
                ))}
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-500">${stats.monthly.totalCost.toFixed(4)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Projected EOM</p>
                  <p className="text-sm font-bold">${stats.monthly.projectedCost.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Per 1K Reqs</p>
                  <p className="text-sm font-bold">${stats.monthly.costPer1K.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Per User</p>
                  <p className="text-sm font-bold">${stats.monthly.costPerActiveUser.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-User Breakdown Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Per-User Breakdown (Today)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.perUser.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No usage data for today yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">User/Device</TableHead>
                        <TableHead className="text-xs text-center">Solves</TableHead>
                        <TableHead className="text-xs text-center">Follow</TableHead>
                        <TableHead className="text-xs text-center">Human</TableHead>
                        <TableHead className="text-xs text-center">Quiz</TableHead>
                        <TableHead className="text-xs text-center">STT</TableHead>
                        <TableHead className="text-xs text-right">Cost</TableHead>
                        <TableHead className="text-xs text-center">Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.perUser.map((u) => (
                        <TableRow key={u.key}>
                          <TableCell className="text-xs font-mono">
                            {u.userId || u.deviceId || "anon"}
                          </TableCell>
                          <TableCell className="text-center text-xs">{u.solves}</TableCell>
                          <TableCell className="text-center text-xs">{u.followUps}</TableCell>
                          <TableCell className="text-center text-xs">{u.humanize}</TableCell>
                          <TableCell className="text-center text-xs">{u.quizzes}</TableCell>
                          <TableCell className="text-center text-xs">{u.transcribe}</TableCell>
                          <TableCell className="text-right text-xs">${u.totalCost.toFixed(4)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.isPremium ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {u.isPremium ? "PRO" : "FREE"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
