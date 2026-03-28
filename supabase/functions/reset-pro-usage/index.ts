import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current month string (e.g. "2026-03")
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Find all active premium users
    const { data: premiumUsers, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_premium", true);

    if (profilesError) {
      throw new Error(`Failed to fetch premium profiles: ${profilesError.message}`);
    }

    if (!premiumUsers || premiumUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No premium users found", month: currentMonth }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const user of premiumUsers) {
      // Check if row already exists for this month
      const { data: existing } = await supabase
        .from("pro_usage")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("usage_month", currentMonth)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Create fresh row with zeroed counters
      await supabase.from("pro_usage").insert({
        user_id: user.user_id,
        usage_month: currentMonth,
        instant_solves: 0,
        deep_solves: 0,
        humanize_count: 0,
        followup_count: 0,
        quiz_count: 0,
      });
      created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        month: currentMonth,
        totalPremiumUsers: premiumUsers.length,
        created,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reset-pro-usage] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
