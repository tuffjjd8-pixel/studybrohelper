import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, CheckCircle2, XCircle, Crown, TrendingUp, Lightbulb, BookOpen, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Profile {
  is_premium?: boolean;
  streak_count?: number;
  total_solves?: number;
}

interface TopicBreakdown {
  name: string;
  total: number;
  correct: number;
  pct: number;
}

interface QuizResultData {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  scorePercentage: number;
  weakTopics: string[];
  topicBreakdown?: TopicBreakdown[];
  subject?: string;
  quizName?: string;
  timestamp: number;
}

const getLetterGrade = (pct: number) => {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 60) return "D";
  return "F";
};

const getEncouragement = (pct: number) => {
  if (pct >= 90) return "Outstanding work! You're crushing it 🏆";
  if (pct >= 80) return "Nice work! You're improving 🔥";
  if (pct >= 70) return "Good effort! Keep pushing 💪";
  if (pct >= 60) return "You're getting there! Stay consistent 📈";
  return "Every expert was once a beginner. Keep going! 🌱";
};

const getSummary = (pct: number, subject: string, correct: number, total: number, weakTopics: string[]) => {
  const topicLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
  if (pct >= 90) {
    return `You aced this ${topicLabel} quiz — ${correct} out of ${total} correct. You clearly have a strong grasp of the material. Keep challenging yourself with harder problems!`;
  }
  if (pct >= 70) {
    const weak = weakTopics.length > 0 ? ` Focus on ${weakTopics.join(" and ")} to push your score even higher.` : "";
    return `Solid performance on this ${topicLabel} quiz with ${correct}/${total} correct.${weak} Review the concepts you missed and try again — you're close to mastering this!`;
  }
  if (pct >= 50) {
    return `You got ${correct} out of ${total} on this ${topicLabel} quiz. That's a good start! Try re-reading the key concepts and practicing similar problems to strengthen your understanding.`;
  }
  return `You scored ${correct}/${total} on this ${topicLabel} quiz. Don't worry — this is a learning opportunity. Break the topic into smaller pieces, review the basics, and try again. You'll get there!`;
};

const LockedCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <Card className="relative overflow-hidden">
    <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-1.5">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-xs font-medium">Pro</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Unlock with StudyBro Pro</p>
    </div>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {children}
    </CardContent>
  </Card>
);

const Results = ({ embedded }: { embedded?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quizData, setQuizData] = useState<QuizResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("last_quiz_result");
      if (stored) {
        setQuizData(JSON.parse(stored));
      }
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
    return embedded ? (
      <div className="text-center py-12 text-muted-foreground">Loading...</div>
    ) : (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    const signInContent = (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-heading font-bold">Results</h1>
        <p className="text-muted-foreground">Sign in to track your performance and improvement.</p>
        <Link to="/auth">
          <Button size="lg" variant="outline">Sign In</Button>
        </Link>
      </div>
    );
    if (embedded) return signInContent;
    return (
      <div className="min-h-screen bg-background">
        <Header streak={0} totalSolves={0} />
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-md mx-auto">{signInContent}</div>
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
  const topicBreakdown = quizData?.topicBreakdown ?? [];
  const quizName = quizData?.quizName || quizData?.subject || "Quiz";
  const subject = quizData?.subject || "General";

  const resultsContent = (
    <div className={embedded ? "space-y-5" : "max-w-md mx-auto space-y-5"}>
      {/* Page Title with Quiz Name */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Quiz Results
        </h1>
        {hasData && (
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
            {quizName}
          </p>
        )}
      </motion.div>

      {!hasData ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Take a quiz to see your results!</p>
          {!embedded && (
            <Link to="/quiz">
              <Button variant="outline">Go to Quiz</Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <>
          {/* Score Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/30 overflow-hidden">
              <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Score</p>
                  <p className="text-4xl font-heading font-bold text-primary">{pct}%</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-heading font-bold">{getLetterGrade(pct)}</div>
                  <p className="text-xs text-muted-foreground">Grade</p>
                </div>
              </div>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Correct: {correct}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span>Wrong: {wrong}</span>
                  </div>
                  <div className="text-muted-foreground">Total: {total}</div>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-sm text-muted-foreground">{getEncouragement(pct)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Summary */}
          {isPremium ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Summary
                    <Badge variant="secondary" className="text-[10px]">
                      <Crown className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getSummary(pct, subject, correct, total, weakTopics)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <LockedCard title="AI Summary" icon={Sparkles}>
                <div className="space-y-2 blur-sm select-none pointer-events-none">
                  <p className="text-sm text-muted-foreground">Personalized AI analysis of your quiz performance with actionable study recommendations...</p>
                </div>
              </LockedCard>
            </motion.div>
          )}

          {/* Topic Breakdown */}
          {topicBreakdown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Topic Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topicBreakdown.map((topic, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{topic.name}</span>
                        <span className="text-muted-foreground">{topic.correct}/{topic.total} ({topic.pct}%)</span>
                      </div>
                      <Progress value={topic.pct} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Weak Topics */}
          {weakTopics.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              {isPremium ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Focus Areas
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {weakTopics.map((topic, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                          <span className="text-muted-foreground">{topic} — needs more practice</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : (
                <LockedCard title="Focus Areas" icon={Lightbulb}>
                  <div className="space-y-2 blur-sm select-none pointer-events-none">
                    <p className="text-sm text-muted-foreground">AI-identified weak topics that need more study...</p>
                  </div>
                </LockedCard>
              )}
            </motion.div>
          )}

          {/* Upgrade CTA */}
          {!isPremium && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Link to="/premium">
                <Card className="border-primary/30 hover:border-primary/60 transition-colors cursor-pointer">
                  <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Unlock Full Results</p>
                      <p className="text-xs text-muted-foreground">Get AI summaries, focus areas & performance tracking</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  if (embedded) return resultsContent;

  return (
    <div className="min-h-screen bg-background">
      <Header
        streak={profile?.streak_count || 0}
        totalSolves={profile?.total_solves || 0}
        isPremium={isPremium}
      />
      <main className="pt-20 pb-24 px-4">
        {resultsContent}
      </main>
      <BottomNav />
    </div>
  );
};

export default Results;
