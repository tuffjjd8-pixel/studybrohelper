import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveTopic {
  topic: string;
  recentCount: number; // solves in last 7 days for this topic
  totalCount: number; // all-time count from subject_solves
}

const TOPIC_KEYWORDS: Array<[RegExp, string]> = [
  [/algebra|equation|polynomial|variable/i, "Algebra"],
  [/geometry|triangle|circle|angle|polygon/i, "Geometry"],
  [/calculus|derivative|integral|limit/i, "Calculus"],
  [/trigonometry|trig|sine|cosine|tangent/i, "Trigonometry"],
  [/statistics|probability|standard deviation/i, "Statistics"],
  [/fraction|decimal|percent/i, "Fractions"],
  [/physics|newton|force|momentum|energy/i, "Physics"],
  [/chemistry|reaction|molecule|atom/i, "Chemistry"],
  [/biology|cell|dna|evolution|photosynthesis/i, "Biology"],
  [/history|war|revolution|civilization/i, "History"],
  [/grammar|essay|literature|english/i, "English"],
  [/economics|supply|demand|market/i, "Economics"],
];

const normalizeSubject = (subject: string): string => {
  if (!subject) return "";
  for (const [re, label] of TOPIC_KEYWORDS) {
    if (re.test(subject)) return label;
  }
  const cleaned = subject.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!cleaned || /^(general|other|topic)$/i.test(cleaned)) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

/**
 * Detects the user's currently "active" topic.
 * Requirements:
 *  - At least 3 solves in the same normalized topic within the last 7 days (recency check)
 *  - Confirmed by subject_solves total >= 3 (activity threshold)
 * Returns null when there isn't enough data — never shows for new users.
 */
export function useActiveTopic(userId: string | undefined) {
  const [activeTopic, setActiveTopic] = useState<ActiveTopic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!userId) {
        setActiveTopic(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Pull subject_solves totals + recent solves in parallel
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [profileRes, recentRes] = await Promise.all([
          supabase.from("profiles").select("subject_solves").eq("user_id", userId).maybeSingle(),
          supabase
            .from("solves")
            .select("subject, created_at")
            .eq("user_id", userId)
            .gte("created_at", sevenDaysAgo)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        const subjectSolves = (profileRes.data?.subject_solves || {}) as Record<string, number>;

        // Tally normalized recent topics
        const recentTally: Record<string, number> = {};
        for (const row of recentRes.data || []) {
          const norm = normalizeSubject(row.subject || "");
          if (!norm) continue;
          recentTally[norm] = (recentTally[norm] || 0) + 1;
        }

        // Pick top recent topic with >=3 recent solves
        let bestTopic = "";
        let bestRecent = 0;
        for (const [topic, count] of Object.entries(recentTally)) {
          if (count >= 3 && count > bestRecent) {
            bestTopic = topic;
            bestRecent = count;
          }
        }

        if (!bestTopic) {
          if (!cancelled) setActiveTopic(null);
          return;
        }

        // Confirm via subject_solves total — need >=3 lifetime in any matching key
        let total = 0;
        for (const [key, count] of Object.entries(subjectSolves)) {
          if (normalizeSubject(key) === bestTopic) total += Number(count) || 0;
        }
        // Fallback: use recent count if subject_solves wasn't populated for this label
        if (total < 3) total = Math.max(total, bestRecent);

        if (total < 3) {
          if (!cancelled) setActiveTopic(null);
          return;
        }

        if (!cancelled) {
          setActiveTopic({ topic: bestTopic, recentCount: bestRecent, totalCount: total });
        }
      } catch (err) {
        console.error("useActiveTopic error:", err);
        if (!cancelled) setActiveTopic(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    detect();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { activeTopic, loading };
}

// Snooze helpers — prevent spamming the user.
const SNOOZE_KEY = "final_challenge_snooze";
const SNOOZE_HOURS = 24;

export function isFinalChallengeSnoozed(topic: string): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, number>;
    const until = map[topic];
    return typeof until === "number" && until > Date.now();
  } catch {
    return false;
  }
}

export function snoozeFinalChallenge(topic: string) {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[topic] = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
