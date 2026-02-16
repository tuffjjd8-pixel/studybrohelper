import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
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

const Results = () => {
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
              <p className="text-muted-foreground">Sign in to track your performance and improvement.</p>
              <Link to="/auth">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </motion.div>
          </div>
        </main>
        <ToolsScroller />
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

  return (
    <div className="min-h-screen bg-background">
      <Header
        streak={profile?.streak_count || 0}
        totalSolves={profile?.total_solves || 0}
        isPremium={isPremium}
      />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto space-y-5">
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
              <Link to="/quiz">
                <Button variant="outline">Go to Quiz</Button>
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Score Display */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
                    <div className="text-6xl font-bold font-heading text-primary mb-1">{pct}%</div>
                    <div className="text-3xl font-bold text-foreground mb-2">{getLetterGrade(pct)}</div>
                    <p className="text-sm text-muted-foreground">{getEncouragement(pct)}</p>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3">
                <Card className="text-center p-4">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xl font-bold">{correct}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </Card>
                <Card className="text-center p-4">
                  <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                  <div className="text-xl font-bold">{wrong}</div>
                  <div className="text-xs text-muted-foreground">Incorrect</div>
                </Card>
                <Card className="text-center p-4">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xl font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
              </motion.div>

              {/* Quiz Summary (Free) */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {getSummary(pct, subject, correct, total, weakTopics)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Areas to Improve (Free) */}
              {weakTopics.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-accent-foreground" />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Focus on: <span className="font-medium text-foreground">{weakTopics.join(", ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Practice these topics to boost your score!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* How to Improve (Free) */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      How to Get Better
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pct < 100 && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Review the questions you got wrong and understand <strong>why</strong> the correct answer is right.</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Retake the quiz after studying — repetition builds mastery.</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Try solving similar problems on your own before checking the answer.</span>
                    </div>
                    {weakTopics.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Spend extra time on <strong>{weakTopics.join(" and ")}</strong> — these are your biggest growth areas.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Premium sections */}
              {isPremium ? (
                <>
                  {/* Topic Breakdown — Premium unlocked */}
                  {topicBreakdown.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Topic Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {topicBreakdown.map((topic) => (
                            <div key={topic.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{topic.name}</span>
                                <span className="text-muted-foreground">
                                  {topic.correct}/{topic.total} ({topic.pct}%)
                                </span>
                              </div>
                              <Progress value={topic.pct} className="h-2" />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Personalized Improvement Plan — Premium */}
                  {weakTopics.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-accent-foreground" />
                            Personalized Improvement Plan
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {weakTopics.map((topic) => (
                            <div key={topic} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-0.5">•</span>
                              <span>
                                Practice more <strong>{topic}</strong> problems — try breaking them into smaller steps and checking each part.
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Recommended Practice — Premium */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          Recommended Practice
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(weakTopics.length > 0 ? weakTopics : topicBreakdown.map((t) => t.name).slice(0, 2)).map((topic) => (
                          <Link key={topic} to="/quiz">
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors mb-1.5">
                              <span className="text-sm font-medium">{topic} Quiz</span>
                              <span className="text-xs text-muted-foreground">Practice →</span>
                            </div>
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              ) : (
                /* Free users: blurred locked cards + upsell */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-4">
                  {/* Locked Topic Breakdown */}
                  <LockedCard title="Detailed Topic Breakdown" icon={TrendingUp}>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Algebra</span>
                          <span className="text-muted-foreground">4/5 (80%)</span>
                        </div>
                        <Progress value={80} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Geometry</span>
                          <span className="text-muted-foreground">2/3 (67%)</span>
                        </div>
                        <Progress value={67} className="h-2" />
                      </div>
                    </div>
                  </LockedCard>

                  {/* Locked Mistake Explanations */}
                  <LockedCard title="Mistake Explanations" icon={Lightbulb}>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Q3: You confused the formula for area with perimeter...</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Q7: The negative sign was dropped when distributing...</span>
                      </div>
                    </div>
                  </LockedCard>

                  {/* Locked Improvement Plan */}
                  <LockedCard title="Personalized Improvement Plan" icon={Sparkles}>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Focus on word problems by identifying key variables first.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Review formulas for area and perimeter calculations.</span>
                      </div>
                    </div>
                  </LockedCard>

                  {/* Locked Recommended Practice */}
                  <LockedCard title="Recommended Practice" icon={BookOpen}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50">
                        <span className="text-sm font-medium">Algebra Quiz</span>
                        <span className="text-xs text-muted-foreground">Practice →</span>
                      </div>
                    </div>
                  </LockedCard>

                  {/* Upsell Card */}
                  <Link to="/premium">
                    <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Crown className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm">Unlock full insights with StudyBro Pro</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Get detailed topic breakdowns, mistake explanations, personalized improvement plans & recommended practice.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

      <ToolsScroller />
    </div>
  );
};

export default Results;
