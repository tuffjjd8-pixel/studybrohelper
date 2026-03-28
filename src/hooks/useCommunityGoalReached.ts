import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCommunityGoalReached() {
  const [goalReached, setGoalReached] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("current_count, target_count")
        .limit(1)
        .maybeSingle();

      if (data) {
        setGoalReached(data.current_count >= data.target_count);
      } else {
        setGoalReached(false);
      }
    };
    check();
  }, []);

  return goalReached;
}
