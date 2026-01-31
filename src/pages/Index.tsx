import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { CameraButton } from "@/components/home/CameraButton";
import { TextInputBox } from "@/components/home/TextInputBox";
import { RecentSolves } from "@/components/home/RecentSolves";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { AnimatedSolutionSteps } from "@/components/solve/AnimatedSolutionSteps";
import { SolveToggles } from "@/components/solve/SolveToggles";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarTrigger } from "@/components/layout/SidebarTrigger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Tier limits
const FREE_GRAPHS_PER_DAY = 4;
const PREMIUM_GRAPHS_PER_DAY = 15;
const FREE_ANIMATED_STEPS_PER_DAY = 5;
const PREMIUM_ANIMATED_STEPS_PER_DAY = 16;

interface SolutionData {
  subject: string;
  question: string;
  answer: string;
  image?: string;
  solveId?: string;
  steps?: Array<{ title: string; content: string }>;
  maxSteps?: number;
  graph?: { type: string; data: Record<string, unknown> };
  limits?: {
    animatedSteps: number;
    graphsPerDay: number;
    graphsUsed: number;
  };
}

// Helper to get current date in CST
const getCSTDate = (): string => {
  const now = new Date();
  const cstOffset = -6 * 60; // CST is UTC-6
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const cstTime = new Date(utc + (cstOffset * 60000));
  return cstTime.toISOString().split('T')[0];
};

const Index = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentSolves, setRecentSolves] = useState<{ id: string; subject: string; question: string; createdAt: Date }[]>([]);
  const [profile, setProfile] = useState<{ 
    streak_count: number; 
    total_solves: number; 
    is_premium: boolean; 
    daily_solves_used: number;
    animated_steps_used_today: number;
    graphs_used_today: number;
    last_usage_date: string | null;
  } | null>(null);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Pending image state
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  // Solve toggles
  const [animatedSteps, setAnimatedSteps] = useState(true);
  const [generateGraph, setGenerateGraph] = useState(false);

  const isPremium = profile?.is_premium || false;
  const maxGraphs = isPremium ? PREMIUM_GRAPHS_PER_DAY : FREE_GRAPHS_PER_DAY;
  const maxAnimatedSteps = isPremium ? PREMIUM_ANIMATED_STEPS_PER_DAY : FREE_ANIMATED_STEPS_PER_DAY;
  
  // Check if usage needs reset (midnight CST)
  const currentCSTDate = getCSTDate();
  const needsReset = profile?.last_usage_date !== currentCSTDate;
  
  const graphsUsedToday = needsReset ? 0 : (profile?.graphs_used_today || 0);
  const animatedStepsUsedToday = needsReset ? 0 : (profile?.animated_steps_used_today || 0);

  // Fetch recent solves and profile for logged-in users
  useEffect(() => {
    if (user) {
      fetchRecentSolves();
      fetchProfile();
    }
  }, [user]);

  // Reset usage counters at midnight CST if needed
  useEffect(() => {
    if (user && profile && needsReset) {
      resetDailyUsage();
    }
  }, [user, profile, needsReset]);

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
      .select("streak_count, total_solves, is_premium, daily_solves_used, animated_steps_used_today, graphs_used_today, last_usage_date")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const resetDailyUsage = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        animated_steps_used_today: 0,
        graphs_used_today: 0,
        last_usage_date: currentCSTDate,
      })
      .eq("user_id", user?.id);

    if (!error) {
      setProfile(prev => prev ? {
        ...prev,
        animated_steps_used_today: 0,
        graphs_used_today: 0,
        last_usage_date: currentCSTDate,
      } : null);
    }
  };

  const handleSolve = async (input: string, imageData?: string) => {
    setIsLoading(true);
    setSolution(null);
    setPendingImage(null);

    // Auto-disable toggles if limits are hit (don't block solving)
    const useAnimatedSteps = animatedSteps && animatedStepsUsedToday < maxAnimatedSteps;
    const useGraph = generateGraph && graphsUsedToday < maxGraphs;

    try {
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: { 
          question: input, 
          image: imageData,
          isPremium,
          animatedSteps: useAnimatedSteps,
          generateGraph: useGraph,
          userGraphCount: graphsUsedToday,
        },
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
          
          // Update profile stats including usage counters
          const updates: Record<string, unknown> = {
            total_solves: (profile?.total_solves || 0) + 1,
            daily_solves_used: (profile?.daily_solves_used || 0) + 1,
            last_solve_date: new Date().toISOString().split('T')[0],
            last_usage_date: currentCSTDate,
          };
          
          // Increment animated steps usage if toggle was on and steps were generated
          if (useAnimatedSteps && data.steps?.length > 0) {
            updates.animated_steps_used_today = animatedStepsUsedToday + 1;
          }
          
          // Increment graph usage if a graph was generated
          if (data.graph) {
            updates.graphs_used_today = graphsUsedToday + 1;
          }

          await supabase
            .from("profiles")
            .update(updates)
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
        steps: data.steps,
        maxSteps: data.maxSteps,
        graph: data.graph,
        limits: data.limits,
      });
      setShowConfetti(true);
    } catch (error: unknown) {
      console.error("Solve error:", error);
      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg.includes("429")) {
        toast.error("AI is busy. Please try again in a moment.");
      } else {
        toast.error("Failed to solve. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = (imageData: string) => {
    setPendingImage(imageData);
    toast.info("Image ready! Press Enter or type a question to solve.");
  };

  const handleTextSubmit = (text: string) => {
    if (pendingImage) {
      handleSolve(text, pendingImage);
    } else {
      handleSolve(text);
    }
  };

  const handleSolveWithPendingImage = () => {
    if (pendingImage) {
      handleSolve("", pendingImage);
    }
  };

  const handleReset = () => {
    setSolution(null);
    setPendingImage(null);
  };

  const handleClearPendingImage = () => {
    setPendingImage(null);
  };

  const showAnimatedSteps = animatedSteps && solution?.steps && solution.steps.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar trigger */}
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
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

              {/* Pending image preview */}
              {pendingImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative max-w-xs"
                >
                  <img 
                    src={pendingImage} 
                    alt="Pending homework" 
                    className="rounded-lg border-2 border-primary/50 max-h-32 object-contain"
                  />
                  <button
                    onClick={handleClearPendingImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold hover:bg-destructive/80"
                  >
                    ×
                  </button>
                  <p className="text-xs text-primary text-center mt-2">
                    Press Enter below to solve, or add a question
                  </p>
                </motion.div>
              )}

              {/* Solve Toggles */}
              <SolveToggles
                animatedSteps={animatedSteps}
                generateGraph={generateGraph}
                onAnimatedStepsChange={setAnimatedSteps}
                onGenerateGraphChange={setGenerateGraph}
                isPremium={isPremium}
                graphsUsed={graphsUsedToday}
                maxGraphs={maxGraphs}
                animatedStepsUsed={animatedStepsUsedToday}
                maxAnimatedSteps={maxAnimatedSteps}
              />

              {/* Divider */}
              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {pendingImage ? "add details or press enter" : "or type it"}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Text input */}
              <TextInputBox 
                onSubmit={handleTextSubmit}
                onEmptySubmit={handleSolveWithPendingImage}
                onImagePaste={handleImageCapture}
                isLoading={isLoading}
                hasPendingImage={!!pendingImage}
                placeholder={pendingImage ? "Add details or press Enter to solve..." : "Paste or type your homework question..."}
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

              {/* Show animated steps if enabled and available */}
              {showAnimatedSteps ? (
                <div className="space-y-6">
                  {/* Question card */}
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Question
                    </h3>
                    {solution.image && (
                      <img 
                        src={solution.image} 
                        alt="Question" 
                        className="max-h-48 rounded-lg mb-3 object-contain"
                      />
                    )}
                    <p className="text-foreground">{solution.question}</p>
                  </div>

                  {/* Animated steps */}
                  <AnimatedSolutionSteps
                    steps={solution.steps!}
                    maxSteps={solution.maxSteps || maxAnimatedSteps}
                    isPremium={isPremium}
                    autoPlay={false}
                    autoPlayDelay={3000}
                    fullSolution={solution.answer}
                  />

                  {/* Graph visualization if available */}
                  {solution.graph && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-6"
                    >
                      <h3 className="text-xs font-medium text-secondary uppercase tracking-wider mb-4">
                        Graph Visualization
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Graph type: {solution.graph.type}
                        </p>
                        <pre className="text-xs text-left mt-2 overflow-x-auto">
                          {JSON.stringify(solution.graph.data, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <SolutionSteps
                  subject={solution.subject}
                  question={solution.question}
                  solution={solution.answer}
                  questionImage={solution.image}
                  solveId={solution.solveId}
                />
              )}
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
