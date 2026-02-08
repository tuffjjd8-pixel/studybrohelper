import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseHumanizeOptions {
  isPremium: boolean;
}

export function useHumanize({ isPremium }: UseHumanizeOptions) {
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const humanize = useCallback(
    async (solution: string, subject: string): Promise<string | null> => {
      if (isHumanizing) return null;
      setIsHumanizing(true);

      try {
        const deviceId = localStorage.getItem("studybro_device_id") || "unknown";
        const { data, error } = await supabase.functions.invoke("humanize-answer", {
          body: { solution, subject },
          headers: { "x-device-id": deviceId },
        });

        if (error) {
          // Check for limit reached (429 from function)
          if (error.message?.includes("limit_reached") || error.message?.includes("429")) {
            setLimitReached(true);
            return null;
          }
          throw error;
        }

        if (data?.error === "limit_reached") {
          setLimitReached(true);
          return null;
        }

        if (data?.humanized) {
          setIsHumanized(true);
          return data.humanized;
        }

        throw new Error("No humanized content returned");
      } catch (err) {
        console.error("Humanize error:", err);
        toast.error("Failed to humanize. Try again.");
        return null;
      } finally {
        setIsHumanizing(false);
      }
    },
    [isHumanizing]
  );

  const reset = useCallback(() => {
    setIsHumanized(false);
    setLimitReached(false);
  }, []);

  return { humanize, isHumanizing, isHumanized, limitReached, reset };
}
