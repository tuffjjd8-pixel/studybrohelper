import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Fire-and-forget usage logger. Logs API requests to api_usage_logs table.
 * Non-blocking — errors are silently caught.
 */
export function logUsage(
  requestType: string,
  estimatedCost: number,
  userId?: string | null
): void {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fire and forget — don't await
    supabase
      .from("api_usage_logs")
      .insert({
        request_type: requestType,
        estimated_cost: estimatedCost,
        user_id: userId || null,
      })
      .then(({ error }) => {
        if (error) console.error("[UsageLogger] Insert error:", error.message);
      });
  } catch (e) {
    // Silently fail — logging should never break the main flow
  }
}
