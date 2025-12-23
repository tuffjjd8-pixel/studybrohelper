import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CameraButton } from "@/components/home/CameraButton";
import { TextInputBox } from "@/components/home/TextInputBox";
import { RecentSolves } from "@/components/home/RecentSolves";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fileToOptimizedDataUrl } from "@/lib/image";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<{
    subject: string;
    question: string;
    answer: string;
    image?: string;
    solveId?: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentSolves, setRecentSolves] = useState<{ id: string; subject: string; question: string; createdAt: Date }[]>([]);
  const [profile, setProfile] = useState<{ streak_count: number; total_solves: number } | null>(null);

  // Fetch recent solves and profile for logged-in users
  useEffect(() => {
    if (user) {
      fetchRecentSolves();
      fetchProfile();
    }
  }, [user]);

  // Handle clipboard paste for images (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't trigger if we're already loading or showing a solution
      if (isLoading || solution) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            (async () => {
              const optimized = await fileToOptimizedDataUrl(file, {
                maxDimension: 1280,
                quality: 0.8,
                mimeType: "image/webp",
              });
              handleImageCapture(optimized);
            })();
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isLoading, solution]);

  const fetchRecentSolves = async () => {
    const { data } = await supabase
      .from("solves")
      .select("id, subject, question_text, created_at")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setRecentSolves(
        data.map((s) => ({
          id: s.id,
          subject: s.subject,
          question: s.question_text || "Image question",
          createdAt: new Date(s.created_at),
        }))
      );
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("streak_count, total_solves")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleSolve = async (input: string, imageData?: string) => {
    setIsLoading(true);
    setSolution(null);

    try {
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: { question: input, image: imageData },
      });

      if (error) throw error;

      let solveId: string | undefined;

      // Save to database if logged in
      if (user) {
        const { data: solveData, error: saveError } = await supabase
          .from("solves")
          .insert({
            user_id: user.id,
            subject: data.subject || "other",
            question_text: input || null,
            question_image_url: imageData || null,
            solution_markdown: data.solution,
          })
          .select("id")
          .single();

        if (saveError) {
          console.error("Save error:", saveError);
        } else {
          solveId = solveData?.id;
          // Update profile stats
          await supabase
            .from("profiles")
            .update({ 
              total_solves: (profile?.total_solves || 0) + 1,
              last_solve_date: new Date().toISOString().split('T')[0]
            })
            .eq("user_id", user.id);
          fetchRecentSolves();
          fetchProfile();
        }
      }

      setSolution({
        subject: data.subject || "other",
        question: input || "Image question",
        answer: data.solution,
        image: imageData,
        solveId,
      });
      setShowConfetti(true);
    } catch (error: any) {
      console.error("Solve error:", error);
      toast.error("Failed to solve. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = (imageData: string) => {
    handleSolve("", imageData);
  };

  const handleTextSubmit = (text: string) => {
    handleSolve(text);
  };

  const handleReset = () => {
    setSolution(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header streak={profile?.streak_count || 0} totalSolves={profile?.total_solves || 0} />
      
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {!solution ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-8 py-8"
            >
              {/* Hero text */}
              <div className="text-center space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-4xl font-heading font-bold"
                >
                  Snap. Solve. <span className="text-gradient">Succeed.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground"
                >
                  Your AI homework bro – instant step-by-step solutions
                </motion.p>
              </div>

              {/* Camera button */}
              <CameraButton onImageCapture={handleImageCapture} isLoading={isLoading} />

              {/* Paste hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-muted-foreground/60"
              >
                or paste an image (Ctrl+V / ⌘+V)
              </motion.p>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or type it</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Text input */}
              <TextInputBox 
                onSubmit={handleTextSubmit} 
                onImagePaste={handleImageCapture}
                isLoading={isLoading} 
              />

              {/* Recent solves */}
              <RecentSolves solves={recentSolves} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8"
            >
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2"
              >
                ← Solve another
              </button>
              <SolutionSteps
                subject={solution.subject}
                question={solution.question}
                solution={solution.answer}
                questionImage={solution.image}
                solveId={solution.solveId}
              />
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Index;
