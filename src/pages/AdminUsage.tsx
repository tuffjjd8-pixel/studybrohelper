import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, DollarSign, Users, Activity, TrendingUp, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

const MODEL_COSTS = [
  { model: "GPT-OSS-120B", cost: "$0.00034", cents: "0.034¢", usage: "Deep solves, quizzes, essays, humanize" },
  { model: "Llama-4-Scout-17B Vision", cost: "$0.00038", cents: "0.038¢", usage: "Image OCR extraction" },
  { model: "GPT-OSS-20B", cost: "$0.00020–0.00025", cents: "0.02–0.025¢", usage: "Instant solves, follow-ups" },
];

export default function AdminUsage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timeView, setTimeView] = useState<"today" | "month">("today");

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

  const handleDeleteUsageData = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Use service role via edge function would be ideal, but for admin we can delete directly
      // since api_usage_logs has admin-only select RLS. We'll use the edge function approach.
      const { error } = await supabase.functions.invoke("admin-usage-stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: "delete_all" },
      });
      if (error) throw error;
      setShowDeleteDialog(false);
      fetchStats();
    } catch (e: any) {
      setError(e.message || "Failed to delete data");
    } finally {
      setDeleting(false);
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
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Usage & Cost Dashboard</h1>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)} title="Delete usage data">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Usage Data</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete usage data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteUsageData} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && !stats ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Today: {stats.today}</p>

          {/* Time View Tabs */}
          <Tabs value={timeView} onValueChange={(v) => setTimeView(v as "today" | "month")}>
            <TabsList className="w-full">
              <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
              <TabsTrigger value="month" className="flex-1">This Month</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-6 mt-4">
              {/* Daily Usage */}
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

              {/* Per-User Breakdown */}
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
                            <TableHead className="text-xs">User</TableHead>
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
                                {u.userId || "anon"}
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
            </TabsContent>

            <TabsContent value="month" className="space-y-6 mt-4">
              {/* Monthly Usage */}
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
            </TabsContent>
          </Tabs>

          {/* Model Cost Reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" /> Model Cost Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Model</TableHead>
                      <TableHead className="text-xs text-center">Cost/Req</TableHead>
                      <TableHead className="text-xs text-center">Cents</TableHead>
                      <TableHead className="text-xs">Used For</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODEL_COSTS.map((m) => (
                      <TableRow key={m.model}>
                        <TableCell className="text-xs font-mono">{m.model}</TableCell>
                        <TableCell className="text-center text-xs">{m.cost}</TableCell>
                        <TableCell className="text-center text-xs">{m.cents}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.usage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}