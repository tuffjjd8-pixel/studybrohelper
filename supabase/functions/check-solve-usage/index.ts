import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_IMAGE_SOLVES_PER_DAY = 3;
const FREE_TEXT_SOLVES_PER_DAY = 4;

// In-memory cache for premium status
const premiumCache = new Map<string, { isPremium: boolean; ts: number }>();
const CACHE_TTL_MS = 15_000;

function getCachedPremium(userId: string): boolean | null {
  const entry = premiumCache.get(userId);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.isPremium;
  premiumCache.delete(userId);
  return null;
}

function setCachedPremium(userId: string, isPremium: boolean) {
  premiumCache.set(userId, { isPremium, ts: Date.now() });
}

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, deviceId, solveType } = await req.json();
    const todayCST = getTodayCST();

    // solveType: "image" | "text" (defaults to "text" for backward compat)
    const isImageSolve = solveType === "image";
    const dailyLimit = isImageSolve ? FREE_IMAGE_SOLVES_PER_DAY : FREE_TEXT_SOLVES_PER_DAY;
    const usageColumn = isImageSolve ? "image_solves_used" : "text_solves_used";

    // Derive userId from verified JWT
    let verifiedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        verifiedUserId = claimsData.claims.sub as string;
      }
    }

    const lookupByUser = !!verifiedUserId;
    const lookupId = lookupByUser ? verifiedUserId : deviceId;

    if (!lookupId) {
      return new Response(
        JSON.stringify({ error: "Must be authenticated or provide deviceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ADMIN BYPASS ===
    if (verifiedUserId) {
      const { isAdmin } = await import("../_shared/pro-limits.ts");
      if (await isAdmin(verifiedUserId)) {
        return new Response(
          JSON.stringify({
            success: true,
            canSolve: true,
            solvesUsed: 0,
            solvesRemaining: 999999,
            maxSolves: 999999,
            isPremium: true,
            isAdmin: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === Premium check ===
    let isPremium = false;
    if (verifiedUserId) {
      const cached = getCachedPremium(verifiedUserId);
      if (cached !== null) {
        isPremium = cached;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", verifiedUserId)
          .single();
        isPremium = profile?.is_premium || false;
        setCachedPremium(verifiedUserId, isPremium);
      }
    }

    if (isPremium) {
      const { getProUsageSummary } = await import("../_shared/pro-limits.ts");
      const proUsage = await getProUsageSummary(verifiedUserId!);
      return new Response(
        JSON.stringify({
          success: true,
          canSolve: true,
          solvesUsed: 0,
          solvesRemaining: -1,
          maxSolves: dailyLimit,
          isPremium: true,
          proUsage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === FREE USER ===
    const filterCol = lookupByUser ? "user_id" : "device_id";
    const { data: existing } = await supabase
      .from("solve_usage")
      .select(`id, solves_used, image_solves_used, text_solves_used`)
      .eq(filterCol, lookupId)
      .eq("usage_date", todayCST)
      .maybeSingle();

    const currentUsed = existing ? (existing as Record<string, any>)[usageColumn] || 0 : 0;

    if (action === "check") {
      const solvesRemaining = Math.max(0, dailyLimit - currentUsed);
      return new Response(
        JSON.stringify({
          canSolve: solvesRemaining > 0,
          solvesUsed: currentUsed,
          solvesRemaining,
          maxSolves: dailyLimit,
          isPremium: false,
          imageLimit: FREE_IMAGE_SOLVES_PER_DAY,
          textLimit: FREE_TEXT_SOLVES_PER_DAY,
          imageSolvesUsed: existing?.image_solves_used || 0,
          textSolvesUsed: existing?.text_solves_used || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "use" || action === "check_and_use") {
      if (currentUsed >= dailyLimit) {
        return new Response(
          JSON.stringify({
            success: false,
            canSolve: false,
            error: `Daily ${isImageSolve ? "image" : "text"} solve limit reached`,
            solvesUsed: currentUsed,
            solvesRemaining: 0,
            maxSolves: dailyLimit,
            isPremium: false,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also increment the legacy solves_used for backward compat
      if (existing) {
        await supabase
          .from("solve_usage")
          .update({
            [usageColumn]: currentUsed + 1,
            solves_used: (existing.solves_used || 0) + 1,
          })
          .eq("id", existing.id);
      } else {
        const insertData: Record<string, unknown> = {
          [usageColumn]: 1,
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
          canSolve: Math.max(0, dailyLimit - newUsed) > 0,
          solvesUsed: newUsed,
          solvesRemaining: Math.max(0, dailyLimit - newUsed),
          maxSolves: dailyLimit,
          isPremium: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'check', 'use', or 'check_and_use'." }),
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
