import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, MessageCircle, BookOpen, Clock, Lock, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  science: "🔬",
  history: "📜",
  english: "📖",
  language: "🌍",
  general: "📚"
};
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
      } = await supabase.from("solves").select("*").order("created_at", {
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
    try {
      const {
        error
      } = await supabase.from("solves").delete().eq("id", id);
      if (error) throw error;
      setSolves(solves.filter(s => s.id !== id));
      toast.success("Problem deleted");
      if (selectedSolve?.id === id) {
        setSelectedSolve(null);
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };
  const isSolveAccessible = (solve: Solve): boolean => {
    if (isPremium) return true;
    return isToday(new Date(solve.created_at));
  };

  const handleSolveClick = (solve: Solve) => {
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
  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background overflow-x-hidden">
      <Header streak={0} totalSolves={solves.length} />

      <main className="pt-20 pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Section - Clean and centered for screenshots */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="mb-6 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-destructive-foreground bg-destructive-foreground">
              Your Solves
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {solves.length} problem{solves.length !== 1 ? "s" : ""} solved
            </p>
          </motion.div>

          {/* Search - Full width, touch-friendly */}
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
                        ${!accessible ? "opacity-60" : ""}
                        ${selectedSolve?.id === solve.id && !isMobile ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(57,255,20,0.15)]" : "bg-card border-border hover:border-primary/50 hover:shadow-[0_0_15px_rgba(57,255,20,0.1)]"}
                      `} style={{
                WebkitTapHighlightColor: 'transparent'
              }}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {accessible ? (subjectIcons[solve.subject] || "📚") : <Lock className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base line-clamp-2 leading-snug">
                            {solve.question_text || "Image question"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span className="capitalize bg-muted/50 px-2 py-0.5 rounded-md">
                              {solve.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(solve.created_at), {
                          addSuffix: true
                        })}
                            </span>
                            {!accessible && (
                              <span className="flex items-center gap-1 text-primary">
                                <Crown className="w-3 h-3" />
                                Pro
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={e => handleDelete(solve.id, e)} className="p-3 -m-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete solve">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>;
                  })}
                </AnimatePresence>
              </div>

              {/* Detail Panel - Desktop only */}
              <div className="hidden lg:block">
                {selectedSolve ? <motion.div key={selectedSolve.id} initial={{
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
                      <span className="text-sm font-medium capitalize px-3 py-1 bg-primary/10 text-primary rounded-lg">
                        {selectedSolve.subject}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg mb-4 leading-snug">
                      {selectedSolve.question_text || "Image question"}
                    </h3>

                    <div className="prose prose-invert prose-sm max-h-64 overflow-y-auto mb-6 bg-muted/30 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                        {selectedSolve.solution_markdown.slice(0, 500)}...
                      </pre>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" size="lg" onClick={() => navigate(`/solve/${selectedSolve.id}`)} className="flex-1 min-h-[48px]">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Full
                      </Button>
                      <Button size="lg" onClick={() => navigate(`/chat/${selectedSolve.id}`)} className="flex-1 min-h-[48px]">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Follow Up
                      </Button>
                    </div>
                  </motion.div> : <div className="sticky top-24 p-8 bg-card/50 rounded-xl border border-dashed border-border text-center">
                    <p className="text-muted-foreground">
                      Select a problem to view details
                    </p>
                  </div>}
              </div>
            </div>}
        </div>
      </main>

      <ToolsScroller />
    </div>;
};
export default History;