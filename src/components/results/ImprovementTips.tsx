import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Lightbulb } from "lucide-react";

interface QuestionResult {
  question: string;
  correct: boolean;
}

interface ImprovementTipsProps {
  pct: number;
  weakTopics: string[];
  questionResults?: QuestionResult[];
  subject: string;
}

export const ImprovementTips = ({ pct, weakTopics, questionResults, subject }: ImprovementTipsProps) => {
  const wrongQuestions = questionResults?.filter(q => !q.correct) || [];

  return (
    <>
      {/* Areas to Improve */}
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

      {/* How to Get Better */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              How to Get Better
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wrongQuestions.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  You missed {wrongQuestions.length} question{wrongQuestions.length > 1 ? "s" : ""} — review <strong>why</strong> the correct answer is right for each one.
                </span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span>Retake the quiz after studying — repetition builds mastery.</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span>Try solving similar {subject} problems on your own before checking the answer.</span>
            </div>
            {weakTopics.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  Spend extra time on <strong>{weakTopics.join(" and ")}</strong> — these are your biggest growth areas.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};
