import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Lightbulb, BookOpen, Sparkles, Crown } from "lucide-react";
import { Link } from "react-router-dom";

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

interface LockedInsightsProps {
  subject: string;
}

export const LockedInsights = ({ subject }: LockedInsightsProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-4">
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

    <LockedCard title="Recommended Practice" icon={BookOpen}>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/50">
          <span className="text-sm font-medium">{subject} Quiz</span>
          <span className="text-xs text-muted-foreground">Practice →</span>
        </div>
      </div>
    </LockedCard>

    <Link to="/premium">
      <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Unlock full insights with StudyBro Pro</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get mistake explanations, personalized improvement plans & recommended practice.
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);
