import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface QuizSummaryProps {
  pct: number;
  subject: string;
  quizName: string;
  correct: number;
  total: number;
  weakTopics: string[];
}

const buildSummary = ({ pct, subject, quizName, correct, total, weakTopics }: QuizSummaryProps): string => {
  const label = quizName.length > 60 ? subject.charAt(0).toUpperCase() + subject.slice(1) : quizName;

  if (pct >= 90) {
    return `You aced "${label}" — ${correct} out of ${total} correct. You clearly have a strong grasp of the material. Keep challenging yourself with harder problems!`;
  }
  if (pct >= 70) {
    const weak = weakTopics.length > 0 ? ` Focus on ${weakTopics.join(" and ")} to push your score even higher.` : "";
    return `Solid performance on "${label}" with ${correct}/${total} correct.${weak} Review the concepts you missed and try again — you're close to mastering this!`;
  }
  if (pct >= 50) {
    const weak = weakTopics.length > 0 ? ` Pay special attention to ${weakTopics.join(", ")}.` : "";
    return `You got ${correct} out of ${total} on "${label}". That's a good start!${weak} Try re-reading the key concepts and practicing similar problems.`;
  }
  const weak = weakTopics.length > 0 ? ` Start by reviewing ${weakTopics.join(" and ")}, then work your way up.` : "";
  return `You scored ${correct}/${total} on "${label}". Don't worry — this is a learning opportunity.${weak} Break the topic into smaller pieces, review the basics, and try again!`;
};

export const QuizSummary = (props: QuizSummaryProps) => (
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
          {buildSummary(props)}
        </p>
      </CardContent>
    </Card>
  </motion.div>
);
