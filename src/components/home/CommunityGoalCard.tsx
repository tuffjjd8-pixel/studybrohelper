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

export function CommunityGoalCard() {
  const [goal, setGoal] = useState<GoalContent | null>(null);

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

  if (!goal) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-5 bg-card rounded-2xl border border-border shadow-sm space-y-3">
        <h3 className="text-lg font-heading font-bold">{goal.title}</h3>
        {goal.image_url && (
          <img
            src={goal.image_url}
            alt="Community goal"
            className="w-full rounded-xl object-cover max-h-48"
          />
        )}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {goal.body}
        </p>
      </div>
    </motion.div>
  );
}
