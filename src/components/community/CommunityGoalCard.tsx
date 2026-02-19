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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-3">
        <h3 className="text-base font-heading font-bold text-foreground">{goal.title}</h3>
        {goal.image_url && (
          <img
            src={goal.image_url}
            alt="Community goal"
            className="rounded-lg max-h-40 mx-auto object-cover"
          />
        )}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {goal.body}
        </p>
      </div>
    </motion.div>
  );
}
