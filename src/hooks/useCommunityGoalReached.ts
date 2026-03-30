import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCommunityGoalReached() {
  const [goalVisible, setGoalVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("community_goal_content")
        .select("visible")
        .limit(1)
        .maybeSingle();

      if (data) {
        setGoalVisible(data.visible === true);
      } else {
        setGoalVisible(false);
      }
    };
    check();
  }, []);

  return goalVisible;
}
