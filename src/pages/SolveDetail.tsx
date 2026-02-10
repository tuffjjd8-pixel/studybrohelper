import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  question_image_url: string | null;
  solution_markdown: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SolveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [solve, setSolve] = useState<Solve | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user && id) {
        fetchSolve();
      } else if (!user && id) {
        loadGuestSolve();
      }
    }
  }, [user, authLoading, id]);

  const loadGuestSolve = () => {
    try {
      const guestSolves = localStorage.getItem("guest_solves");
      if (guestSolves) {
        const solves = JSON.parse(guestSolves);
        const found = solves.find((s: Solve) => s.id === id);
        if (found) {
          setSolve(found);
          const guestChats = localStorage.getItem(`guest_chat_${id}`);
          if (guestChats) {
            setMessages(JSON.parse(guestChats));
          }
        } else {
          toast.error("Solve not found");
          navigate("/history");
        }
      } else {
        toast.error("Solve not found");
        navigate("/history");
      }
    } catch (error) {
      console.error("Error loading guest solve:", error);
      navigate("/history");
    } finally {
      setLoading(false);
    }
  };

  const fetchSolve = async () => {
    try {
      const [solveRes, messagesRes, profileRes] = await Promise.all([
        supabase.from("solves").select("*").eq("id", id).maybeSingle(),
        supabase.from("chat_messages").select("*").eq("solve_id", id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("is_premium").eq("user_id", user!.id).single(),
      ]);

      if (solveRes.error) throw solveRes.error;
      if (!solveRes.data) {
        toast.error("Solve not found");
        navigate("/history");
        return;
      }
      setSolve(solveRes.data);
      setIsPremium(profileRes.data?.is_premium ?? false);
      setMessages(
        (messagesRes.data || []).map((m) => ({
          ...m,
          role: m.role as "user" | "assistant",
        }))
      );
    } catch (error) {
      console.error("Error fetching solve:", error);
      toast.error("Failed to load solve");
      navigate("/history");
    } finally {
      setLoading(false);
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
              solveId={solve.id}
              isPremium={isPremium}
              isHistory={true}
              showFollowUps={true}
              showHumanize={true}
            />
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SolveDetail;
