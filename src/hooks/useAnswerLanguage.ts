import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ANSWER_LANG_KEY = "answer_language";

export function useAnswerLanguage(userId: string | undefined, isPremium: boolean) {
  const [answerLanguage, setAnswerLanguage] = useState<string>("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      supabase
        .from("profiles")
        .select("answer_language")
        .eq("user_id", userId)
        .single()
        .then(({ data }) => {
          if (data?.answer_language) {
            setAnswerLanguage(data.answer_language);
          }
          setLoading(false);
        });
    } else {
      const saved = localStorage.getItem(ANSWER_LANG_KEY);
      if (saved) setAnswerLanguage(saved);
      setLoading(false);
    }
  }, [userId]);

  const updateLanguage = useCallback(
    async (lang: string) => {
      setAnswerLanguage(lang);
      if (userId) {
        await supabase
          .from("profiles")
          .update({ answer_language: lang } as any)
          .eq("user_id", userId);
      } else {
        localStorage.setItem(ANSWER_LANG_KEY, lang);
      }
    },
    [userId]
  );

  return { answerLanguage, updateLanguage, loading };
}

// Get cached answer language for use in AI calls
export async function getAnswerLanguage(userId: string | undefined): Promise<string> {
  // If no userId provided, try to get it from the current session
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    effectiveUserId = session?.user?.id;
  }

  if (effectiveUserId) {
    const { data } = await supabase
      .from("profiles")
      .select("answer_language")
      .eq("user_id", effectiveUserId)
      .single();
    return (data as any)?.answer_language || "en";
  }
  return localStorage.getItem(ANSWER_LANG_KEY) || "en";
}
