import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface GoalContent {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  visible: boolean;
}

const PARTICIPATION_KEY = "community_goal_participate";

export function CommunityGoalCard() {
  const [goal, setGoal] = useState<GoalContent | null>(null);
  const [participate, setParticipate] = useState<boolean>(() => {
    const saved = localStorage.getItem(PARTICIPATION_KEY);
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    const fetchGoal = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("id, title, body, image_url, visible")
        .eq("visible", true)
        .limit(1)
        .maybeSingle();

      if (data) setGoal(data);
    };
    fetchGoal();
  }, []);

  const handleParticipationChange = (value: boolean) => {
    setParticipate(value);
    localStorage.setItem(PARTICIPATION_KEY, String(value));
  };

  if (!goal) return null;

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

        {/* User participation selector */}
        <div className="pt-2 border-t border-primary/10">
          <p className="text-xs text-muted-foreground mb-1.5">Participate in this Community Goal?</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleParticipationChange(true)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                participate
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => handleParticipationChange(false)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !participate
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
