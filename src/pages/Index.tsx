import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CameraButton } from "@/components/home/CameraButton";
import { TextInputBox } from "@/components/home/TextInputBox";
import { RecentSolves } from "@/components/home/RecentSolves";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { CommunityGoalCard } from "@/components/home/CommunityGoalCard";
import { useAdminControls } from "@/hooks/useAdminControls";
import { SolutionSteps } from "@/components/solve/SolutionSteps";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScannerModal } from "@/components/scanner/ScannerModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSolveUsage } from "@/hooks/useSolveUsage";
import { toast } from "sonner";

interface SolutionData {
  subject: string;
  question: string;
  answer: string;
  image?: string;
  solveId?: string;
}

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

const Index = () => {
  const { user } = useAuth();
  const { isVisible } = useAdminControls(user?.email);
  const [searchParams] = useSearchParams();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Capture referral code from URL and store it
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem("pending_referral_code", refCode);
    }
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const [solveStartTime, setSolveStartTime] = useState<number | null>(null);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentSolves, setRecentSolves] = useState<{
    id: string;
    subject: string;
    question: string;
    createdAt: Date;
  }[]>([]);
  const [profile, setProfile] = useState<{
    streak_count: number;
    total_solves: number;
    is_premium: boolean;
    daily_solves_used: number;
  } | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const isPremium = profile?.is_premium || false;
  const solveUsage = useSolveUsage(user?.id, isPremium);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecentSolves();
    }
  }, [user]);

  const fetchRecentSolves = async () => {
    const { data } = await supabase.from("solves").select("id, subject, question_text, created_at").eq("user_id", user?.id).order("created_at", { ascending: false }).limit(5);
    if (data) {
      setRecentSolves(data.map(s => ({
        id: s.id,
        subject: s.subject,
        question: s.question_text || "Image question",
        createdAt: new Date(s.created_at)
      })));
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("streak_count, total_solves, is_premium, daily_solves_used").eq("user_id", user?.id).single();
    if (data) {
      setProfile(data);
    }
  };

  const handleSolve = async (input: string, imageData?: string) => {
    if (!solveUsage.isPremium && !solveUsage.canSolve) {
      toast.error("You've used all 5 free solves today. Upgrade to Pro for unlimited solves!");
      return;
    }
    setIsLoading(true);
    setSolution(null);
    setPendingImage(null);
    const startTime = Date.now();
    setSolveStartTime(startTime);

    if (!isPremium) {
      const solveAllowed = await solveUsage.useSolve();
      if (!solveAllowed) {
        toast.error("Daily solve limit reached. Upgrade to Pro for unlimited!");
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("solve-homework", {
        body: {
          question: input,
          image: imageData,
          isPremium,
          animatedSteps: false,
          generateGraph: false
        }
      });
      if (error) throw error;
      let solveId: string | undefined;

      if (user) {
        const solveTimeSeconds = (Date.now() - startTime) / 1000;
        const isSpeedSolve = solveTimeSeconds <= 120;
        const insertPromise = supabase.from("solves").insert({
          user_id: user.id,
          subject: data.subject || "other",
          question_text: input || null,
          question_image_url: imageData || null,
          solution_markdown: data.solution
        }).select("id").single();

        const profileUpdates: Record<string, unknown> = {
          total_solves: (profile?.total_solves || 0) + 1,
          daily_solves_used: (profile?.daily_solves_used || 0) + 1,
          last_solve_date: new Date().toISOString().split('T')[0]
        };
        if (isSpeedSolve) {
          profileUpdates.speed_solves = (profile?.total_solves !== undefined ? (profile as any).speed_solves || 0 : 0) + 1;
        }
        const updatePromise = supabase.from("profiles").update(profileUpdates).eq("user_id", user.id);
        const [solveResult, _profileResult] = await Promise.all([insertPromise, updatePromise]);
        if (solveResult.error) {
          console.error("Save error:", solveResult.error);
        } else {
          solveId = solveResult.data?.id;
          if ((profile?.total_solves || 0) === 0) {
            try {
              await supabase.rpc("complete_referral", { referred_id: user.id });
            } catch (_) {}
          }
          fetchRecentSolves();
          fetchProfile();
        }
      } else {
        solveId = `guest-${Date.now()}`;
        const guestSolve = {
          id: solveId,
          subject: data.subject || "other",
          question_text: input || null,
          question_image_url: imageData || null,
          solution_markdown: data.solution,
          created_at: new Date().toISOString()
        };
        try {
          const existingSolves = JSON.parse(localStorage.getItem("guest_solves") || "[]");
          existingSolves.unshift(guestSolve);
          localStorage.setItem("guest_solves", JSON.stringify(existingSolves.slice(0, 50)));
        } catch (e) {
          console.error("Failed to save to localStorage:", e);
        }
      }

      setSolution({
        subject: data.subject || "other",
        question: input || "Image question",
        answer: data.solution,
        image: imageData,
        solveId
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

  const handleScannerSolved = (question: string, solutionText: string, subject: string, image?: string) => {
    setSolution({ subject, question, answer: solutionText, image });
    setShowConfetti(true);
    fetchRecentSolves();
    fetchProfile();
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

  // Determine what features to show: admin sees everything, users see nothing advanced
  const showFollowUps = true;
  const showHumanize = true;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header streak={profile?.streak_count || 0} totalSolves={profile?.total_solves || 0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {!solution ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 py-8">
              <div className="text-center space-y-2">
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-heading font-bold">
                  Snap. Solve. <span className="text-gradient">Succeed.</span>
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground">
                  Your AI homework bro – instant step-by-step solutions
                </motion.p>
              </div>

              <CameraButton onClick={() => setScannerOpen(true)} isLoading={isLoading} />

              {pendingImage && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative max-w-xs">
                  <img src={pendingImage} alt="Pending homework" className="rounded-lg border-2 border-primary/50 max-h-32 object-contain" />
                  <button onClick={handleClearPendingImage} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold hover:bg-destructive/80">
                    ×
                  </button>
                  <p className="text-xs text-primary text-center mt-2">
                    Press Enter below to solve, or add a question
                  </p>
                </motion.div>
              )}

              {/* Solve usage info - simplified, no toggles */}
              {!isPremium && (
                <div className="w-full max-w-md mx-auto">
                  <div className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Solves Today</span>
                      {isPremium && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Crown className="w-3 h-3" />
                          Pro
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(solveUsage.solvesUsed / solveUsage.maxSolves) * 100}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {Math.max(0, solveUsage.maxSolves - solveUsage.solvesUsed)} solve{Math.max(0, solveUsage.maxSolves - solveUsage.solvesUsed) !== 1 ? "s" : ""} remaining today • Resets at midnight CST
                      </p>
                    </div>
                    {!solveUsage.canSolve && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        You've used all {solveUsage.maxSolves} solves for today. Upgrade to Pro for unlimited solves.
                      </div>
                    )}
                    {!!user && solveUsage.canSolve && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                          <Crown className="w-3 h-3 inline mr-1" />
                          Upgrade to Pro for unlimited solves + advanced results
                        </p>
                      </div>
                    )}
                    {!user && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                          Sign in to use History, Quizzes, and Polls.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {pendingImage ? "add details or press enter" : "or type it"}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <TextInputBox onSubmit={handleTextSubmit} onEmptySubmit={handleSolveWithPendingImage} onImagePaste={handleImageCapture} isLoading={isLoading} hasPendingImage={!!pendingImage} placeholder={pendingImage ? "Add details or press Enter to solve..." : "Paste or type your homework question..."} speechInputEnabled={isPremium} isPremium={isPremium} speechLanguage="auto" onSpeechUsed={async () => {}} isAuthenticated={!!user} canUseSpeechClip={isPremium} speechClipsRemaining={isPremium ? 15 : 0} maxSpeechClips={isPremium ? 15 : 0} hoursUntilReset={0} />

              {isVisible('community_goal') && <CommunityGoalCard />}

              <ToolsScroller />

              <RecentSolves solves={recentSolves} />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
              <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2">
                ← Solve another
              </button>

              <SolutionSteps
                subject={solution.subject}
                question={solution.question}
                solution={solution.answer}
                questionImage={solution.image}
                solveId={solution.solveId}
                isPremium={isPremium}
                showFollowUps={showFollowUps}
                showHumanize={showHumanize}
              />
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <ScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onSolved={handleScannerSolved} userId={user?.id} isPremium={isPremium} />
    </div>
  );
};
export default Index;