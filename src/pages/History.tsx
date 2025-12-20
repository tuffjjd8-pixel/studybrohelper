import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, MessageCircle, BookOpen, ChevronRight, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

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
  general: "📚",
};

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSolves();
    }
  }, [user]);

  const fetchSolves = async () => {
    try {
      const { data, error } = await supabase
        .from("solves")
        .select("*")
        .order("created_at", { ascending: false });

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
    try {
      const { error } = await supabase.from("solves").delete().eq("id", id);
      if (error) throw error;
      setSolves(solves.filter((s) => s.id !== id));
      toast.success("Problem deleted");
      if (selectedSolve?.id === id) {
        setSelectedSolve(null);
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const filteredSolves = solves.filter(
    (solve) =>
      solve.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      solve.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={solves.length} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-heading font-bold mb-2">Your Solves</h1>
            <p className="text-muted-foreground text-sm">
              {solves.length} problems solved
            </p>
          </motion.div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredSolves.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium mb-2">No solves yet</h3>
              <p className="text-muted-foreground mb-6">
                Start solving homework to build your history
              </p>
              <Button onClick={() => navigate("/")}>Solve Something</Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSolves.map((solve, index) => (
                    <motion.div
                      key={solve.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedSolve(solve)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedSolve?.id === solve.id
                          ? "bg-primary/10 border-primary"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {subjectIcons[solve.subject] || "📚"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {solve.question_text || "Image question"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="capitalize">{solve.subject}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDistanceToNow(new Date(solve.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDelete(solve.id, e)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Detail panel (desktop) */}
              <div className="hidden lg:block">
                {selectedSolve ? (
                  <motion.div
                    key={selectedSolve.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="sticky top-24 p-6 bg-card rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">
                        {subjectIcons[selectedSolve.subject] || "📚"}
                      </span>
                      <span className="text-sm font-medium capitalize px-2 py-1 bg-primary/10 text-primary rounded">
                        {selectedSolve.subject}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold mb-4">
                      {selectedSolve.question_text || "Image question"}
                    </h3>

                    <div className="prose prose-invert prose-sm max-h-64 overflow-y-auto mb-6">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedSolve.solution_markdown.slice(0, 500)}...
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/solve/${selectedSolve.id}`)}
                        className="flex-1"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Full
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/chat/${selectedSolve.id}`)}
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Follow Up
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="sticky top-24 p-8 bg-card/50 rounded-xl border border-dashed border-border text-center">
                    <p className="text-muted-foreground">
                      Select a problem to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default History;
