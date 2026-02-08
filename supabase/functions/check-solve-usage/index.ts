import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_SOLVES_PER_DAY = 5;

// In-memory cache for premium status (avoids repeated DB lookups within same cold-start)
const premiumCache = new Map<string, { isPremium: boolean; ts: number }>();
const CACHE_TTL_MS = 15_000; // 15 seconds

function getCachedPremium(userId: string): boolean | null {
  const entry = premiumCache.get(userId);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.isPremium;
  premiumCache.delete(userId);
  return null;
}

function setCachedPremium(userId: string, isPremium: boolean) {
  premiumCache.set(userId, { isPremium, ts: Date.now() });
}

// Get today's date in CST (UTC-6)
function getTodayCST(): string {
  const now = new Date();
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

    const lookupByUser = !!userId;
    const lookupId = lookupByUser ? userId : deviceId;

    if (!lookupId) {
      return new Response(
        JSON.stringify({ error: "Must provide userId or deviceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === FAST PATH: Premium check with in-memory cache ===
    let isPremium = false;
    if (userId) {
      const cached = getCachedPremium(userId);
      if (cached !== null) {
        isPremium = cached;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", userId)
          .single();
        isPremium = profile?.is_premium || false;
        setCachedPremium(userId, isPremium);
      }
    }

    // Premium users: instant return, no usage tracking
    if (isPremium) {
      const resp = action === "use"
        ? { success: true, solvesUsed: 0, solvesRemaining: -1, isPremium: true }
        : { canSolve: true, solvesUsed: 0, solvesRemaining: -1, isPremium: true };
      return new Response(JSON.stringify(resp), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === FREE USER: Single query to get today's usage ===
    const filterCol = lookupByUser ? "user_id" : "device_id";
    const { data: existing } = await supabase
      .from("solve_usage")
      .select("id, solves_used")
      .eq(filterCol, lookupId)
      .eq("usage_date", todayCST)
      .maybeSingle();

    const currentUsed = existing?.solves_used || 0;

    if (action === "check") {
      const solvesRemaining = Math.max(0, FREE_SOLVES_PER_DAY - currentUsed);
      return new Response(
        JSON.stringify({
          canSolve: solvesRemaining > 0,
          solvesUsed: currentUsed,
          solvesRemaining,
          maxSolves: FREE_SOLVES_PER_DAY,
          isPremium: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "use") {
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

      // Single upsert: update if exists, insert if not
      if (existing) {
        await supabase
          .from("solve_usage")
          .update({ solves_used: currentUsed + 1 })
          .eq("id", existing.id);
      } else {
        const insertData: Record<string, unknown> = {
          solves_used: 1,
          usage_date: todayCST,
        };
        if (lookupByUser) insertData.user_id = lookupId;
        else insertData.device_id = lookupId;
        await supabase.from("solve_usage").insert(insertData);
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
