import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface GoalContent {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  visible: boolean;
  current_count: number;
  target_count: number;
}

const PARTICIPATION_KEY = "community_goal_participation";

interface CommunityGoalCardProps {
  onParticipationChange?: (participating: boolean | null) => void;
}

export function CommunityGoalCard({ onParticipationChange }: CommunityGoalCardProps) {
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [participate, setParticipate] = useState<boolean | null>(() => {
    const saved = localStorage.getItem(PARTICIPATION_KEY);
    if (saved === null) return null;
    return saved === "true";
  });

  useEffect(() => {
    const fetchGoal = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("id, title, body, image_url, visible, current_count, target_count")
        .eq("visible", true)
        .limit(1)
        .maybeSingle();

      if (data) setGoal(data as GoalContent);
    };
    fetchGoal();
  }, []);

  const handleParticipationChange = (value: boolean) => {
    setParticipate(value);
    localStorage.setItem(PARTICIPATION_KEY, String(value));
    onParticipationChange?.(value);
  };

  // Notify parent of initial state
  useEffect(() => {
    onParticipationChange?.(participate);
  }, []);

  if (!goal) return null;
  if (participate === false) return null;

  const progressPercent = goal.target_count > 0
    ? Math.min(100, Math.round((goal.current_count / goal.target_count) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{goal.title}</p>
        {goal.image_url && (
          <img src={goal.image_url} alt="Goal" className="rounded-lg max-h-32 object-cover mx-auto" />
        )}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {goal.body}
        </p>

        {/* Progress bar - only show when participating */}
        {participate === true && (
          <div className="pt-2 space-y-1">
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {goal.current_count} / {goal.target_count} approved
            </p>
          </div>
        )}

        {/* Participation selector - show when no choice made */}
        {participate === null && (
          <div className="pt-2 border-t border-primary/10">
            <p className="text-xs text-muted-foreground mb-1.5">Participate in this Community Goal?</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleParticipationChange(true)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/80"
              >
                Yes
              </button>
              <button
                onClick={() => handleParticipationChange(false)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
