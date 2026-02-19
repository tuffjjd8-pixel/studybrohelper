import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";

interface QuickStatsProps {
  correct: number;
  wrong: number;
  total: number;
}

export const QuickStats = ({ correct, wrong, total }: QuickStatsProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15 }}
    className="grid grid-cols-3 gap-3"
  >
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
);
