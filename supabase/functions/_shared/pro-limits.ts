import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// ADMIN BYPASS — unlimited usage for admin accounts
// ============================================================
export async function isAdmin(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

// ============================================================
// PRO MONTHLY LIMITS
// ============================================================
export const PRO_LIMITS = {
  instant_solves: 400,
  deep_solves: 120,
  humanize: 80,
  followups: 200,
  quizzes: 40,
};

// Feature types that map to pro_usage columns
export type ProFeature = "instant_solves" | "deep_solves" | "humanize_count" | "followup_count" | "quiz_count";

// Map feature to its limit
const FEATURE_LIMIT_MAP: Record<ProFeature, number> = {
  instant_solves: PRO_LIMITS.instant_solves,
  deep_solves: PRO_LIMITS.deep_solves,
  humanize_count: PRO_LIMITS.humanize,
  followup_count: PRO_LIMITS.followups,
  quiz_count: PRO_LIMITS.quizzes,
};

// Get current month string in CST (UTC-6)
function getCurrentMonthCST(): string {
  const now = new Date();
  const cstOffset = -6 * 60;
  const cstTime = new Date(now.getTime() + (cstOffset + now.getTimezoneOffset()) * 60000);
  return `${cstTime.getFullYear()}-${String(cstTime.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Check if a Pro user can use a feature and optionally increment usage.
 * Uses service role key for direct DB access (bypasses RLS).
 * 
 * @returns { allowed: boolean, used: number, limit: number }
 */
export async function checkAndUseProFeature(
  userId: string,
  feature: ProFeature,
  action: "check" | "use" = "use"
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const usageMonth = getCurrentMonthCST();
  const limit = FEATURE_LIMIT_MAP[feature];

  // Get or create usage row for this month
  const { data: existing } = await supabase
    .from("pro_usage")
    .select("id, " + feature)
    .eq("user_id", userId)
    .eq("usage_month", usageMonth)
    .maybeSingle();

  const currentUsed = existing ? (existing as Record<string, any>)[feature] || 0 : 0;

  if (currentUsed >= limit) {
    return { allowed: false, used: currentUsed, limit };
  }

  if (action === "check") {
    return { allowed: true, used: currentUsed, limit };
  }

  // Increment usage
  if (existing) {
    await supabase
      .from("pro_usage")
      .update({ [feature]: currentUsed + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("pro_usage")
      .insert({
        user_id: userId,
        usage_month: usageMonth,
        [feature]: 1,
      });
  }

  return { allowed: true, used: currentUsed + 1, limit };
}

/**
 * Get full Pro usage summary for a user (for frontend display).
 */
export async function getProUsageSummary(userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const usageMonth = getCurrentMonthCST();

  const { data: existing } = await supabase
    .from("pro_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("usage_month", usageMonth)
    .maybeSingle();

  return {
    instant_solves: { used: existing?.instant_solves || 0, limit: PRO_LIMITS.instant_solves },
    deep_solves: { used: existing?.deep_solves || 0, limit: PRO_LIMITS.deep_solves },
    humanize: { used: existing?.humanize_count || 0, limit: PRO_LIMITS.humanize },
    followups: { used: existing?.followup_count || 0, limit: PRO_LIMITS.followups },
    quizzes: { used: existing?.quiz_count || 0, limit: PRO_LIMITS.quizzes },
    month: usageMonth,
  };
}
