import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScoreHero } from "@/components/results/ScoreHero";
import { QuickStats } from "@/components/results/QuickStats";
import { QuizSummary } from "@/components/results/QuizSummary";
import { ImprovementTips } from "@/components/results/ImprovementTips";
import { PremiumInsights } from "@/components/results/PremiumInsights";
import { LockedInsights } from "@/components/results/LockedInsights";

interface Profile {
  is_premium?: boolean;
  streak_count?: number;
  total_solves?: number;
}

interface QuestionResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
}

interface QuizResultData {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  scorePercentage: number;
  weakTopics: string[];
  questionResults?: QuestionResult[];
  subject?: string;
  quizName?: string;
  timestamp: number;
}

const Results = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quizData, setQuizData] = useState<QuizResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("last_quiz_result");
      if (stored) setQuizData(JSON.parse(stored));
    } catch (err) {
      console.error("Error reading quiz result:", err);
    }

    if (user) {
      fetchProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, streak_count, total_solves")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = profile?.is_premium === true;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header streak={0} totalSolves={0} />
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-md mx-auto text-center py-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Results</h1>
              <p className="text-muted-foreground">Sign in to track your performance.</p>
              <Link to="/auth">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </motion.div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const hasData = quizData !== null;
  const pct = quizData?.scorePercentage ?? 0;
  const correct = quizData?.correctAnswers ?? 0;
  const wrong = quizData?.wrongAnswers ?? 0;
  const total = quizData?.totalQuestions ?? 0;
  const weakTopics = quizData?.weakTopics ?? [];
  const questionResults = quizData?.questionResults ?? [];
  const quizName = quizData?.quizName || quizData?.subject || "Quiz";
  const subject = quizData?.subject || "General";

  return (
    <div className="min-h-screen bg-background">
      <Header
        streak={profile?.streak_count || 0}
        totalSolves={profile?.total_solves || 0}
        isPremium={isPremium}
      />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto space-y-5">
          {/* Page Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Quiz Results
            </h1>
            {hasData && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{quizName}</p>
            )}
          </motion.div>

          {!hasData ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Take a quiz to see your results!</p>
              <Link to="/quiz">
                <Button variant="outline">Go to Quiz</Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <ScoreHero pct={pct} />
              <QuickStats correct={correct} wrong={wrong} total={total} />
              <QuizSummary
                pct={pct}
                subject={subject}
                quizName={quizName}
                correct={correct}
                total={total}
                weakTopics={weakTopics}
              />
              <ImprovementTips
                pct={pct}
                weakTopics={weakTopics}
                questionResults={questionResults}
                subject={subject}
              />

              {isPremium ? (
                <PremiumInsights
                  weakTopics={weakTopics}
                  questionResults={questionResults}
                  subject={subject}
                  pct={pct}
                />
              ) : (
                <LockedInsights subject={subject} />
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Results;
