import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

// Groq cost estimates per request type (USD)
const COST_PER_REQUEST: Record<string, number> = {
  solve: 0.0012,
  "follow-up": 0.0008,
  humanize: 0.0010,
  quiz: 0.0015,
  transcribe: 0.0006,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get today's date in CST
    const now = new Date();
    const cstOffset = -6 * 60;
    const cstTime = new Date(now.getTime() + (cstOffset + now.getTimezoneOffset()) * 60000);
    const todayCST = cstTime.toISOString().split("T")[0];

    // Get first day of month
    const monthStart = `${todayCST.substring(0, 7)}-01`;

    // === DAILY USAGE ===
    const { data: dailyLogs } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", `${todayCST}T00:00:00`)
      .lte("created_at", `${todayCST}T23:59:59`);

    const dailyByType: Record<string, number> = {};
    const dailyCostByType: Record<string, number> = {};
    let dailyTotalCost = 0;

    for (const log of dailyLogs || []) {
      const type = log.request_type || "unknown";
      dailyByType[type] = (dailyByType[type] || 0) + 1;
      const cost = log.estimated_cost || COST_PER_REQUEST[type] || 0;
      dailyCostByType[type] = (dailyCostByType[type] || 0) + cost;
      dailyTotalCost += cost;
    }

    // === MONTHLY USAGE ===
    const { data: monthlyLogs } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", `${monthStart}T00:00:00`);

    const monthlyByType: Record<string, number> = {};
    const monthlyCostByType: Record<string, number> = {};
    let monthlyTotalCost = 0;
    let monthlyTotalRequests = 0;

    for (const log of monthlyLogs || []) {
      const type = log.request_type || "unknown";
      monthlyByType[type] = (monthlyByType[type] || 0) + 1;
      const cost = log.estimated_cost || COST_PER_REQUEST[type] || 0;
      monthlyCostByType[type] = (monthlyCostByType[type] || 0) + cost;
      monthlyTotalCost += cost;
      monthlyTotalRequests++;
    }

    // Projected EOM cost
    const dayOfMonth = cstTime.getDate();
    const daysInMonth = new Date(cstTime.getFullYear(), cstTime.getMonth() + 1, 0).getDate();
    const projectedMonthlyCost = dayOfMonth > 0 ? (monthlyTotalCost / dayOfMonth) * daysInMonth : 0;

    // Cost per 1K requests
    const costPer1K = monthlyTotalRequests > 0 ? (monthlyTotalCost / monthlyTotalRequests) * 1000 : 0;

    // === PER-USER BREAKDOWN (today) ===
    const userMap = new Map<string, { userId: string | null; deviceId: string | null; solves: number; followUps: number; humanize: number; quizzes: number; transcribe: number; totalCost: number }>();

    for (const log of dailyLogs || []) {
      const key = log.user_id || log.device_id || "anonymous";
      if (!userMap.has(key)) {
        userMap.set(key, { userId: log.user_id, deviceId: log.device_id, solves: 0, followUps: 0, humanize: 0, quizzes: 0, transcribe: 0, totalCost: 0 });
      }
      const entry = userMap.get(key)!;
      const cost = log.estimated_cost || COST_PER_REQUEST[log.request_type] || 0;
      entry.totalCost += cost;

      switch (log.request_type) {
        case "solve": entry.solves++; break;
        case "follow-up": entry.followUps++; break;
        case "humanize": entry.humanize++; break;
        case "quiz": entry.quizzes++; break;
        case "transcribe": entry.transcribe++; break;
      }
    }

    // Get premium status for each user
    const userIds = [...userMap.values()].map(u => u.userId).filter(Boolean) as string[];
    let premiumMap: Record<string, boolean> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, is_premium, display_name")
        .in("user_id", userIds);
      
      for (const p of profiles || []) {
        premiumMap[p.user_id] = p.is_premium;
      }
    }

    const perUserBreakdown = [...userMap.entries()].map(([key, data]) => ({
      key,
      userId: data.userId ? data.userId.substring(0, 8) + "..." : null,
      deviceId: data.deviceId ? data.deviceId.substring(0, 12) + "..." : null,
      solves: data.solves,
      followUps: data.followUps,
      humanize: data.humanize,
      quizzes: data.quizzes,
      transcribe: data.transcribe,
      totalCost: Number(data.totalCost.toFixed(4)),
      isPremium: data.userId ? (premiumMap[data.userId] || false) : false,
    }));

    // Active users this month
    const uniqueUsers = new Set((monthlyLogs || []).map(l => l.user_id || l.device_id).filter(Boolean));
    const costPerActiveUser = uniqueUsers.size > 0 ? monthlyTotalCost / uniqueUsers.size : 0;

    return new Response(
      JSON.stringify({
        today: todayCST,
        daily: {
          byType: dailyByType,
          totalRequests: dailyLogs?.length || 0,
          cost: dailyCostByType,
          totalCost: Number(dailyTotalCost.toFixed(4)),
        },
        monthly: {
          byType: monthlyByType,
          totalRequests: monthlyTotalRequests,
          cost: monthlyCostByType,
          totalCost: Number(monthlyTotalCost.toFixed(4)),
          projectedCost: Number(projectedMonthlyCost.toFixed(4)),
          costPer1K: Number(costPer1K.toFixed(4)),
          costPerActiveUser: Number(costPerActiveUser.toFixed(4)),
          activeUsers: uniqueUsers.size,
          daysElapsed: dayOfMonth,
          daysInMonth,
        },
        perUser: perUserBreakdown,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin usage stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
