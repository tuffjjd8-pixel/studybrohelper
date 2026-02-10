import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Lightbulb, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface QuestionResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
}

interface PremiumInsightsProps {
  weakTopics: string[];
  questionResults: QuestionResult[];
  subject: string;
  pct: number;
}

export const PremiumInsights = ({ weakTopics, questionResults, subject, pct }: PremiumInsightsProps) => {
  const wrongQuestions = questionResults.filter(q => !q.correct);
  const correctCount = questionResults.filter(q => q.correct).length;
  const totalCount = questionResults.length;

  return (
    <>
      {/* Score Breakdown Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Overall Accuracy</span>
                <span className="text-muted-foreground">{correctCount}/{totalCount} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mistake Explanations */}
      {wrongQuestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                Mistake Explanations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wrongQuestions.map((q, idx) => (
                <div key={idx} className="space-y-1.5 pb-3 last:pb-0 border-b border-border last:border-0">
                  <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                  <div className="flex items-start gap-2 text-xs">
                    <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">Your answer: <span className="text-foreground">{q.userAnswer}</span></span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">Correct: <span className="text-foreground">{q.correctAnswer}</span></span>
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground mt-1 pl-5">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Personalized Improvement Plan */}
      {weakTopics.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
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

      {/* Recommended Practice */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Recommended Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(weakTopics.length > 0 ? weakTopics : [subject]).map((topic) => (
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
  );
};
