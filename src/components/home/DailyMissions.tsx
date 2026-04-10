import { motion } from "framer-motion";
import { Target, Flame, Zap, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface DailyMissionsProps {
  totalSolves: number;
  streak: number;
}

interface Mission {
  id: string;
  label: string;
  icon: React.ReactNode;
  xp: number;
  current: number;
  target: number;
}

export function DailyMissions({ totalSolves, streak }: DailyMissionsProps) {
  // Use localStorage to track daily progress
  const todayKey = new Date().toISOString().split("T")[0];
  const stored = useMemo(() => {
    try {
      const raw = localStorage.getItem(`daily_missions_${todayKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [todayKey]);

  const dailySolves = stored?.solves ?? 0;

  const missions: Mission[] = useMemo(() => [
    {
      id: "solve3",
      label: "Solve 3 problems",
      icon: <Target className="w-4 h-4" />,
      xp: 30,
      current: Math.min(dailySolves, 3),
      target: 3,
    },
    {
      id: "streak",
      label: "Keep your streak alive",
      icon: <Flame className="w-4 h-4" />,
      xp: 20,
      current: streak > 0 ? 1 : 0,
      target: 1,
    },
  ], [dailySolves, streak]);

  const totalXP = totalSolves * 10;
  const earnedXP = missions.reduce((sum, m) => sum + (m.current >= m.target ? m.xp : 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-sm"
    >
      {/* XP display */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">{totalXP} XP</span>
        </div>
        {earnedXP > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs text-primary/70 font-medium"
          >
            +{earnedXP} today
          </motion.span>
        )}
      </div>

      {/* Missions */}
      <div className="space-y-2">
        {missions.map((mission) => {
          const done = mission.current >= mission.target;
          const pct = Math.min((mission.current / mission.target) * 100, 100);
          return (
            <div
              key={mission.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors ${
                done
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className={`shrink-0 ${done ? "text-primary" : "text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : mission.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${done ? "text-primary line-through" : "text-foreground"}`}>
                    {mission.label}
                  </span>
                  <span className="text-[10px] text-primary font-bold">+{mission.xp} XP</span>
                </div>
                <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
