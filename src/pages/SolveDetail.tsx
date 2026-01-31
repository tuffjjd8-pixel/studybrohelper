import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, BookOpen, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  question_image_url: string | null;
  solution_markdown: string;
  created_at: string;
}

const SolveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solve, setSolve] = useState<Solve | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchSolve();
    }
  }, [user, id]);

  const fetchSolve = async () => {
    try {
      const { data, error } = await supabase
        .from("solves")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Solve not found");
        navigate("/history");
        return;
      }
      setSolve(data);
    } catch (error) {
      console.error("Error fetching solve:", error);
      toast.error("Failed to load solve");
      navigate("/history");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (solve) {
      try {
        await navigator.share({
          title: "StudyBro AI Solution",
          text: `Check out this ${solve.subject} solution from StudyBro AI!`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!");
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!solve) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => navigate("/history")}
              className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to History
            </button>

            <SolutionSteps
              subject={solve.subject}
              question={solve.question_text || "Image question"}
              solution={solve.solution_markdown}
              questionImage={solve.question_image_url || undefined}
            />

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => navigate(`/chat/${solve.id}`)}
                className="flex-1 min-w-[140px]"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask Follow-up
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/quiz/${solve.id}`)}
                className="flex-1 min-w-[140px]"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Take Quiz
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SolveDetail;
