import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, BookOpen, Clock, Lock, Crown, CheckSquare, Square, X, AlertTriangle, FolderMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDistanceToNow, isToday } from "date-fns";
interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  question_image_url: string | null;
  solution_markdown: string;
  created_at: string;
}
const subjectIcons: Record<string, string> = {
  math: "📐",
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🧬",
  engineering: "⚙️",
  statistics: "📊",
  "computer science": "💻",
  "logic / puzzle": "🧩",
  // legacy fallbacks
  science: "🔬",
  history: "📜",
  english: "📖",
  language: "🌍",
  general: "📚",
  other: "📚",
};
const subjectLabels: Record<string, string> = {
  math: "Math",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  engineering: "Engineering",
  statistics: "Statistics",
  "computer science": "Computer Science",
  "logic / puzzle": "Logic / Puzzle",
};
const formatSubject = (s: string) =>
  subjectLabels[s] || s.charAt(0).toUpperCase() + s.slice(1);
const History = () => {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const isMobile = useIsMobile();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Bulk management state
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSolves();
      fetchPremiumStatus();
    } else if (!authLoading) {
      loadGuestHistory();
    }
  }, [user, authLoading]);

  const fetchPremiumStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("user_id", user.id)
      .single();
    if (data) setIsPremium(data.is_premium);
  };
  const loadGuestHistory = () => {
    try {
      const guestSolves = localStorage.getItem("guest_solves");
      if (guestSolves) {
        setSolves(JSON.parse(guestSolves));
      }
    } catch (error) {
      console.error("Error loading guest history:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchSolves = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("solves").select("*").eq("user_id", user!.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setSolves(data || []);
    } catch (error) {
      console.error("Error fetching solves:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      try {
        const guestSolves = localStorage.getItem("guest_solves");
        if (guestSolves) {
          const parsed = JSON.parse(guestSolves);
          const updated = parsed.filter((s: Solve) => s.id !== id);
          localStorage.setItem("guest_solves", JSON.stringify(updated));
          setSolves(updated);
          toast.success("Problem deleted");
        }
      } catch (error) {
        toast.error("Failed to delete");
      }
      if (selectedSolve?.id === id) {
        setSelectedSolve(null);
      }
      return;
    }
    const previousSolves = [...solves];
    setSolves(prev => prev.filter(s => s.id !== id));
    if (selectedSolve?.id === id) {
      setSelectedSolve(null);
    }
    try {
      const { error } = await supabase.from("solves").delete().eq("id", id);
      if (error) throw error;
      toast.success("Problem deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete");
      setSolves(previousSolves);
    }
  };

  // ------- Bulk delete helpers -------
  const removeSolvesLocally = (ids: string[]) => {
    const idSet = new Set(ids);
    setSolves(prev => prev.filter(s => !idSet.has(s.id)));
    if (selectedSolve && idSet.has(selectedSolve.id)) setSelectedSolve(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  const deleteSolvesByIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    const previous = [...solves];
    removeSolvesLocally(ids);

    if (!user) {
      try {
        const guestSolves = localStorage.getItem("guest_solves");
        const parsed = guestSolves ? JSON.parse(guestSolves) : [];
        const idSet = new Set(ids);
        const updated = parsed.filter((s: Solve) => !idSet.has(s.id));
        localStorage.setItem("guest_solves", JSON.stringify(updated));
        toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "solve" : "solves"}`);
      } catch {
        toast.error("Failed to delete");
        setSolves(previous);
      }
      return;
    }

    try {
      const { error } = await supabase.from("solves").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "solve" : "solves"}`);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error("Failed to delete");
      setSolves(previous);
    }
  };

  const deleteAll = async () => {
    const ids = solves.map(s => s.id);
    await deleteSolvesByIds(ids);
  };

  const deleteByCategory = async (category: string) => {
    const ids = solves.filter(s => s.subject === category).map(s => s.id);
    if (ids.length === 0) {
      toast.info("No solves in that category");
      return;
    }
    await deleteSolvesByIds(ids);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitManageMode = () => {
    setManageMode(false);
    setSelectedIds(new Set());
  };

  const isSolveAccessible = (solve: Solve): boolean => {
    if (isPremium) return true;
    return isToday(new Date(solve.created_at));
  };

  const handleSolveClick = (solve: Solve) => {
    if (manageMode) {
      toggleSelect(solve.id);
      return;
    }
    if (!isSolveAccessible(solve)) {
      toast.error("Upgrade to Pro to access older history.");
      return;
    }
    if (isMobile) {
      navigate(`/solve/${solve.id}`);
    } else {
      setSelectedSolve(solve);
    }
  };
  const filteredSolves = solves.filter(solve => solve.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) || solve.subject.toLowerCase().includes(searchQuery.toLowerCase()));

  const availableCategories = useMemo(() => {
    const counts = new Map<string, number>();
    solves.forEach(s => counts.set(s.subject, (counts.get(s.subject) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [solves]);

  const allVisibleSelected = filteredSolves.length > 0 && filteredSolves.every(s => selectedIds.has(s.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredSolves.forEach(s => next.delete(s.id));
      } else {
        filteredSolves.forEach(s => next.add(s.id));
      }
      return next;
    });
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background overflow-x-hidden">
      <Header streak={0} totalSolves={solves.length} />

      <main className="pt-20 pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-destructive-foreground bg-destructive-foreground">
                  Your Solves
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {solves.length} problem{solves.length !== 1 ? "s" : ""} solved
                </p>
              </div>
              {solves.length > 0 && (
                manageMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exitManageMode}
                    className="flex-shrink-0 border-primary/40 hover:border-primary text-primary"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Done
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManageMode(true)}
                    className="flex-shrink-0 border-primary/40 hover:border-primary hover:shadow-[0_0_15px_rgba(57,255,20,0.2)] text-primary"
                  >
                    Manage
                  </Button>
                )
              )}
            </div>
          </motion.div>

          {/* Manage Toolbar */}
          <AnimatePresence>
            {manageMode && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-3 rounded-xl border border-primary/30 bg-card shadow-[0_0_20px_rgba(57,255,20,0.08)]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      onClick={toggleSelectAllVisible}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      {allVisibleSelected ? "Unselect all" : "Select all"}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedIds.size === 0}
                      onClick={() => setConfirmDeleteSelected(true)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCategoryPickerOpen(true)}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <FolderMinus className="w-4 h-4 mr-1" />
                      Delete by category
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmClearAll(true)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Clear all
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search your history..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base bg-card border-border rounded-xl" />
          </div>

          {loading ? <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
            </div> : filteredSolves.length === 0 ? <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center py-16 px-4">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium mb-2">No solves yet</h3>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                Start solving homework to build your history
              </p>
              <Button onClick={() => navigate("/")} className="min-h-[48px] px-6">
                Solve Something
              </Button>
            </motion.div> : <div className="grid gap-4 lg:grid-cols-2">
              {/* Solve List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSolves.map((solve, index) => {
                    const accessible = isSolveAccessible(solve);
                    const isSelected = selectedIds.has(solve.id);
                    return <motion.div key={solve.id} initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} exit={{
                opacity: 0,
                x: -100
              }} transition={{
                delay: index * 0.03
              }} onClick={() => handleSolveClick(solve)} className={`
                        p-4 rounded-xl border cursor-pointer transition-all
                        min-h-[72px] touch-manipulation select-none
                        active:scale-[0.98] active:opacity-90
                        ${!accessible && !manageMode ? "opacity-60" : ""}
                        ${isSelected ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(57,255,20,0.2)]" :
                          (selectedSolve?.id === solve.id && !isMobile && !manageMode ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(57,255,20,0.15)]" : "bg-card border-border hover:border-primary/50 hover:shadow-[0_0_15px_rgba(57,255,20,0.1)]")}
                      `} style={{
                WebkitTapHighlightColor: 'transparent'
              }}>
                      <div className="flex items-center gap-3">
                        {manageMode && (
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-primary" />
                            ) : (
                              <Square className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="text-2xl flex-shrink-0">
                          {accessible || manageMode ? (subjectIcons[solve.subject] || "📚") : <Lock className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base line-clamp-2 leading-snug">
                            {solve.question_text || "Study Problem"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span className="bg-muted/50 px-2 py-0.5 rounded-md">
                              {formatSubject(solve.subject)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(solve.created_at), {
                          addSuffix: true
                        })}
                            </span>
                            {!accessible && !manageMode && (
                              <span className="flex items-center gap-1 text-primary">
                                <Crown className="w-3 h-3" />
                                Pro
                              </span>
                            )}
                          </div>
                        </div>
                        {!manageMode && (
                          <button onClick={e => handleDelete(solve.id, e)} className="p-3 -m-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete solve">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>;
                  })}
                </AnimatePresence>
              </div>

              {/* Detail Panel - Desktop only */}
              <div className="hidden lg:block">
                {selectedSolve && !manageMode ? <motion.div key={selectedSolve.id} initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} className="sticky top-24 p-6 bg-card rounded-xl border border-border shadow-[0_0_30px_rgba(57,255,20,0.08)]">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">
                        {subjectIcons[selectedSolve.subject] || "📚"}
                      </span>
                      <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-lg">
                        {formatSubject(selectedSolve.subject)}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg mb-4 leading-snug">
                      {selectedSolve.question_text || "Study Problem"}
                    </h3>

                    <div className="prose prose-invert prose-sm max-h-64 overflow-y-auto mb-6 bg-muted/30 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                        {selectedSolve.solution_markdown.slice(0, 500)}...
                      </pre>
                    </div>

                    <Button variant="outline" size="lg" onClick={() => navigate(`/solve/${selectedSolve.id}`)} className="w-full min-h-[48px]">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Full
                    </Button>
                  </motion.div> : <div className="sticky top-24 p-8 bg-card/50 rounded-xl border border-dashed border-border text-center">
                    <p className="text-muted-foreground">
                      {manageMode ? "Select solves to manage" : "Select a problem to view details"}
                    </p>
                  </div>}
              </div>
            </div>}
        </div>
      </main>

      {/* Confirm: Delete selected */}
      <AlertDialog open={confirmDeleteSelected} onOpenChange={setConfirmDeleteSelected}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} solve{selectedIds.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected items from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteSolvesByIds(Array.from(selectedIds));
                setConfirmDeleteSelected(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: Clear all */}
      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent className="bg-card border-destructive/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Clear ALL history?
            </AlertTriangle>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete every solve in your history ({solves.length} item{solves.length === 1 ? "" : "s"}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteAll();
                setConfirmClearAll(false);
                exitManageMode();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category picker */}
      <Dialog open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Delete by category</DialogTitle>
            <DialogDescription>
              Choose a category. All solves in that category will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2 max-h-[50vh] overflow-y-auto">
            {availableCategories.length === 0 ? (
              <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No categories yet</p>
            ) : availableCategories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => {
                  setPendingCategory(cat);
                  setCategoryPickerOpen(false);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="text-xl">{subjectIcons[cat] || "📚"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{formatSubject(cat)}</p>
                  <p className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm: Delete category */}
      <AlertDialog open={!!pendingCategory} onOpenChange={(o) => !o && setPendingCategory(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete all "{pendingCategory ? formatSubject(pendingCategory) : ""}" solves?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove every solve in this category from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingCategory) await deleteByCategory(pendingCategory);
                setPendingCategory(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>;
};
export default History;
