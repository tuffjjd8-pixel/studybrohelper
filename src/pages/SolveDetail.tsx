import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { useAuth } from "@/hooks/useAuth";
import { useAdminControls } from "@/hooks/useAdminControls";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Share2, Bot } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

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
  const { isVisible } = useAdminControls(user?.email);
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
          // Load guest chat messages
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
        supabase
          .from("chat_messages")
          .select("*")
          .eq("solve_id", id)
          .order("created_at", { ascending: true }),
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

  const handleFollowUp = async (question: string) => {
    if (!solve || !question.trim()) return;

    setIsAsking(true);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke("follow-up-chat", {
        body: {
          solveId: solve.id,
          message: question.trim(),
          context: {
            subject: solve.subject,
            question: solve.question_text,
            solution: solve.solution_markdown,
          },
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);

      if (user) {
        await supabase.from("chat_messages").insert([
          { solve_id: solve.id, role: "user", content: question.trim() },
          { solve_id: solve.id, role: "assistant", content: data.response },
        ]);
      } else {
        localStorage.setItem(`guest_chat_${id}`, JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error("Error asking follow-up:", error);
      toast.error("Failed to get response");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsAsking(false);
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
              solveId={solve.id}
              isPremium={isPremium}
              isHistory={true}
              showFollowUps={isVisible('solve_followups')}
              showHumanize={isVisible('solve_humanize')}
            />

          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SolveDetail;
