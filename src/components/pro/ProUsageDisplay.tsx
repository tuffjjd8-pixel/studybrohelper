import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Zap, Brain, MessageSquare, Wand2, BookOpen } from "lucide-react";

interface ProUsageItem {
  used: number;
  limit: number;
}

interface ProUsageSummary {
  instant_solves: ProUsageItem;
  deep_solves: ProUsageItem;
  humanize: ProUsageItem;
  followups: ProUsageItem;
  quizzes: ProUsageItem;
  month: string;
}

interface ProUsageDisplayProps {
  proUsage: ProUsageSummary;
}

const features = [
  { key: "instant_solves" as const, label: "Instant Solves", icon: Zap },
  { key: "deep_solves" as const, label: "Deep Solves", icon: Brain },
  { key: "humanize" as const, label: "Humanize", icon: Wand2 },
  { key: "followups" as const, label: "Follow-Ups", icon: MessageSquare },
  { key: "quizzes" as const, label: "Quizzes", icon: BookOpen },
];

function getWarningColor(percent: number): string {
  if (percent >= 100) return "text-destructive";
  if (percent >= 90) return "text-orange-500";
  if (percent >= 80) return "text-yellow-500";
  return "text-muted-foreground";
}

function getProgressClass(percent: number): string {
  if (percent >= 100) return "[&>div]:bg-destructive";
  if (percent >= 90) return "[&>div]:bg-orange-500";
  if (percent >= 80) return "[&>div]:bg-yellow-500";
  return "";
}

export function ProUsageDisplay({ proUsage }: ProUsageDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Monthly Pro Usage</h3>
        <span className="text-xs text-muted-foreground">{proUsage.month}</span>
      </div>

      {features.map((feat, i) => {
        const item = proUsage[feat.key];
        const percent = (item.used / item.limit) * 100;
        const Icon = feat.icon;

        return (
          <motion.div
            key={feat.key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="p-3 bg-card rounded-xl border border-border"
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${getWarningColor(percent)}`} />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{feat.label}</span>
                  <span className={`text-sm ${getWarningColor(percent)}`}>
                    {item.used}/{item.limit}
                  </span>
                </div>
                <Progress value={Math.min(percent, 100)} className={`h-2 ${getProgressClass(percent)}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
