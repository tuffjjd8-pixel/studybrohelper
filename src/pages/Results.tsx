import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, CheckCircle2, XCircle, Crown, TrendingUp, Lightbulb, BookOpen, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Profile {
  is_premium?: boolean;
  streak_count?: number;
  total_solves?: number;
}

interface SolveRecord {
  id: string;
  subject: string;
  question_text: string | null;
  solution_markdown: string;
  created_at: string;
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

const getTopicFromSubject = (subject: string) => {
  const s = subject.toLowerCase();
  if (s.includes("algebra") || s.includes("equation")) return "Algebra";
  if (s.includes("geometry") || s.includes("triangle") || s.includes("circle")) return "Geometry";
  if (s.includes("calculus") || s.includes("derivative") || s.includes("integral")) return "Calculus";
  if (s.includes("statistics") || s.includes("probability")) return "Statistics";
  if (s.includes("physics")) return "Physics";
  if (s.includes("chemistry")) return "Chemistry";
  if (s.includes("biology")) return "Biology";
  if (s.includes("history")) return "History";
  if (s.includes("english") || s.includes("grammar")) return "English";
  return subject || "General";
};

const Results = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [solves, setSolves] = useState<SolveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [profileRes, solvesRes] = await Promise.all([
        supabase.from("profiles").select("is_premium, streak_count, total_solves").eq("user_id", user.id).single(),
        supabase.from("solves").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setProfile(profileRes.data);
      setSolves(solvesRes.data || []);
    } catch (err) {
      console.error("Error fetching results data:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = profile?.is_premium === true;

  const stats = useMemo(() => {
    const total = solves.length;
    if (total === 0) return null;

    // Approximate: solves with longer solutions likely had correct reasoning
    const withSolution = solves.filter((s) => s.solution_markdown.length > 100);
    const correct = withSolution.length;
    const wrong = total - correct;
    const pct = Math.round((correct / total) * 100);

    // Topic breakdown
    const topicMap: Record<string, { total: number; correct: number }> = {};
    solves.forEach((s) => {
      const topic = getTopicFromSubject(s.subject);
      if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 };
      topicMap[topic].total++;
      if (s.solution_markdown.length > 100) topicMap[topic].correct++;
    });

    const topics = Object.entries(topicMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        correct: data.correct,
        pct: Math.round((data.correct / data.total) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);

    const weakTopics = topics.filter((t) => t.pct < 80).slice(0, 3);
    const strongTopics = topics.filter((t) => t.pct >= 80).slice(0, 3);

    return { total, correct, wrong, pct, topics, weakTopics, strongTopics };
  }, [solves]);

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
        <BottomNav />
      </div>
    );
  }

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
              Your Results
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Performance summary based on your recent solves
            </p>
          </motion.div>

          {!stats ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No solves yet. Start solving to see your results!</p>
              <Link to="/">
                <Button variant="outline">Start Solving</Button>
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Score Display */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
                    <div className="text-6xl font-bold font-heading text-primary mb-1">{stats.pct}%</div>
                    <div className="text-3xl font-bold text-foreground mb-2">{getLetterGrade(stats.pct)}</div>
                    <p className="text-sm text-muted-foreground">{getEncouragement(stats.pct)}</p>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-3">
                <Card className="text-center p-4">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xl font-bold">{stats.correct}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </Card>
                <Card className="text-center p-4">
                  <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                  <div className="text-xl font-bold">{stats.wrong}</div>
                  <div className="text-xs text-muted-foreground">Needs Work</div>
                </Card>
                <Card className="text-center p-4">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
              </motion.div>

              {/* Weak Areas (Free) */}
              {stats.weakTopics.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-accent-foreground" />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {stats.weakTopics.map((topic) => (
                        <div key={topic.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{topic.name}</span>
                            <span className="text-muted-foreground">{topic.pct}%</span>
                          </div>
                          <Progress value={topic.pct} className="h-2" />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground pt-1">
                        💡 Focus on these topics to boost your overall score!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Premium Section */}
              {isPremium ? (
                <>
                  {/* Full Topic Breakdown */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Topic Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {stats.topics.map((topic) => (
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

                  {/* Personalized Tips */}
                  {stats.weakTopics.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-accent-foreground" />
                            Improvement Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {stats.weakTopics.map((topic) => (
                            <div key={topic.name} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-0.5">•</span>
                              <span>
                                Practice more <strong>{topic.name}</strong> problems — try breaking them into smaller steps.
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Recommended Practice */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          Recommended Practice
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(stats.weakTopics.length > 0 ? stats.weakTopics : stats.topics.slice(0, 2)).map((topic) => (
                          <Link key={topic.name} to={`/quiz`}>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors mb-1.5">
                              <span className="text-sm font-medium">{topic.name} Quiz</span>
                              <span className="text-xs text-muted-foreground">Practice →</span>
                            </div>
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              ) : (
                /* Premium Upsell */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Link to="/premium">
                    <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Crown className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Unlock Detailed Insights
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Get topic breakdowns, personalized improvement tips, mistake explanations & recommended practice with Premium.
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

      <BottomNav />
    </div>
  );
};

export default Results;
