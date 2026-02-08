import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Daily solve limits
const FREE_SOLVES_PER_DAY = 5;

// Get today's date in CST (UTC-6)
function getTodayCST(): string {
  const now = new Date();
  // CST is UTC-6
  const cstOffset = -6 * 60;
  const cstTime = new Date(now.getTime() + (cstOffset + now.getTimezoneOffset()) * 60000);
  return cstTime.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, deviceId, userId } = await req.json();
    const todayCST = getTodayCST();

    console.log(`[check-solve-usage] action=${action}, userId=${userId || "none"}, deviceId=${deviceId || "none"}, date=${todayCST}`);

    // Determine lookup method: userId takes priority over deviceId
    const lookupByUser = !!userId;
    const lookupId = lookupByUser ? userId : deviceId;

    if (!lookupId) {
      return new Response(
        JSON.stringify({ error: "Must provide userId or deviceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is premium (only for authenticated users)
    let isPremium = false;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("user_id", userId)
        .single();
      isPremium = profile?.is_premium || false;
    }

    // Premium users have unlimited solves
    if (isPremium) {
      if (action === "check") {
        return new Response(
          JSON.stringify({ canSolve: true, solvesUsed: 0, solvesRemaining: -1, isPremium: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // For "use" action, premium users always succeed — no tracking needed
      if (action === "use") {
        return new Response(
          JSON.stringify({ success: true, solvesUsed: 0, solvesRemaining: -1, isPremium: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === FREE USER LOGIC ===

    // Build the query filter
    const filterCol = lookupByUser ? "user_id" : "device_id";

    // Get or create today's usage record
    const { data: existing } = await supabase
      .from("solve_usage")
      .select("*")
      .eq(filterCol, lookupId)
      .eq("usage_date", todayCST)
      .maybeSingle();

    if (action === "check") {
      const solvesUsed = existing?.solves_used || 0;
      const solvesRemaining = Math.max(0, FREE_SOLVES_PER_DAY - solvesUsed);
      return new Response(
        JSON.stringify({
          canSolve: solvesRemaining > 0,
          solvesUsed,
          solvesRemaining,
          maxSolves: FREE_SOLVES_PER_DAY,
          isPremium: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "use") {
      const currentUsed = existing?.solves_used || 0;

      if (currentUsed >= FREE_SOLVES_PER_DAY) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Daily solve limit reached",
            solvesUsed: currentUsed,
            solvesRemaining: 0,
            maxSolves: FREE_SOLVES_PER_DAY,
            isPremium: false,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("solve_usage")
          .update({ solves_used: currentUsed + 1 })
          .eq("id", existing.id);

        if (error) {
          console.error("[check-solve-usage] Update error:", error);
          throw error;
        }
      } else {
        // Insert new record for today
        const insertData: Record<string, unknown> = {
          solves_used: 1,
          usage_date: todayCST,
        };
        if (lookupByUser) {
          insertData.user_id = lookupId;
        } else {
          insertData.device_id = lookupId;
        }

        const { error } = await supabase
          .from("solve_usage")
          .insert(insertData);

        if (error) {
          console.error("[check-solve-usage] Insert error:", error);
          throw error;
        }
      }

      const newUsed = currentUsed + 1;
      return new Response(
        JSON.stringify({
          success: true,
          solvesUsed: newUsed,
          solvesRemaining: Math.max(0, FREE_SOLVES_PER_DAY - newUsed),
          maxSolves: FREE_SOLVES_PER_DAY,
          isPremium: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check' or 'use'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-solve-usage] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
