import { useState } from "react";
import { motion } from "framer-motion";
import { CameraButton } from "@/components/home/CameraButton";
import { TextInputBox } from "@/components/home/TextInputBox";
import { RecentSolves } from "@/components/home/RecentSolves";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<{
    subject: string;
    question: string;
    answer: string;
    image?: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentSolves] = useState<{ id: string; subject: string; question: string; createdAt: Date }[]>([]);

  const handleSolve = async (input: string, imageData?: string) => {
    setIsLoading(true);
    setSolution(null);

    try {
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: { question: input, image: imageData },
      });

      if (error) throw error;

      setSolution({
        subject: data.subject || "other",
        question: input || "Image question",
        answer: data.solution,
        image: imageData,
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
      <Header streak={0} totalSolves={0} />
      
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

              {/* Divider */}
              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or type it</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Text input */}
              <TextInputBox onSubmit={handleTextSubmit} isLoading={isLoading} />

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
