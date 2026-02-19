import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

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

interface ScoreHeroProps {
  pct: number;
}

export const ScoreHero = ({ pct }: ScoreHeroProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
        <div className="text-6xl font-bold font-heading text-primary mb-1">{pct}%</div>
        <div className="text-3xl font-bold text-foreground mb-2">{getLetterGrade(pct)}</div>
        <p className="text-sm text-muted-foreground">{getEncouragement(pct)}</p>
      </div>
    </Card>
  </motion.div>
);
