import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";

// Estimated cost per request type (USD)
const COST_PER_REQUEST: Record<string, number> = {
  solve: 0.004,
  follow_up: 0.003,
  humanize: 0.002,
  quiz: 0.005,
  transcribe: 0.006,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get today's date boundaries (CST = UTC-6)
    const now = new Date();
    const cstOffset = -6 * 60 * 60 * 1000;
    const cstNow = new Date(now.getTime() + cstOffset);
    const todayStr = cstNow.toISOString().split("T")[0];
    const todayStart = new Date(`${todayStr}T00:00:00-06:00`).toISOString();
    const todayEnd = new Date(`${todayStr}T23:59:59-06:00`).toISOString();

    // Month boundaries
    const monthStart = new Date(`${todayStr.substring(0, 7)}-01T00:00:00-06:00`).toISOString();

    // === DAILY USAGE ===
    const { data: dailyLogs } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    const dailyUsage: Record<string, number> = {};
    let dailyCost = 0;
    const dailyCostByType: Record<string, number> = {};

    for (const log of dailyLogs || []) {
      dailyUsage[log.request_type] = (dailyUsage[log.request_type] || 0) + 1;
      const cost = Number(log.estimated_cost) || COST_PER_REQUEST[log.request_type] || 0;
      dailyCost += cost;
      dailyCostByType[log.request_type] = (dailyCostByType[log.request_type] || 0) + cost;
    }

    // === MONTHLY USAGE ===
    const { data: monthlyLogs } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", monthStart);

    const monthlyUsage: Record<string, number> = {};
    let monthlyCost = 0;
    const monthlyCostByType: Record<string, number> = {};

    for (const log of monthlyLogs || []) {
      monthlyUsage[log.request_type] = (monthlyUsage[log.request_type] || 0) + 1;
      const cost = Number(log.estimated_cost) || COST_PER_REQUEST[log.request_type] || 0;
      monthlyCost += cost;
      monthlyCostByType[log.request_type] = (monthlyCostByType[log.request_type] || 0) + cost;
    }

    // Days elapsed in month
    const dayOfMonth = cstNow.getDate();
    const daysInMonth = new Date(cstNow.getFullYear(), cstNow.getMonth() + 1, 0).getDate();
    const projectedMonthlyCost = dayOfMonth > 0 ? (monthlyCost / dayOfMonth) * daysInMonth : 0;

    // Total monthly requests
    const totalMonthlyRequests = Object.values(monthlyUsage).reduce((a, b) => a + b, 0);
    const costPer1000 = totalMonthlyRequests > 0 ? (monthlyCost / totalMonthlyRequests) * 1000 : 0;

    // === PER-USER BREAKDOWN (today) ===
    const userMap = new Map<string, Record<string, number | boolean | string>>();

    for (const log of dailyLogs || []) {
      const key = log.user_id || log.device_id || "anonymous";
      if (!userMap.has(key)) {
        userMap.set(key, {
          user_id: log.user_id || "",
          device_id: log.device_id || "",
          solve: 0, follow_up: 0, humanize: 0, quiz: 0, transcribe: 0,
          is_premium: false,
        });
      }
      const entry = userMap.get(key)!;
      entry[log.request_type] = ((entry[log.request_type] as number) || 0) + 1;
    }

    // Fetch premium status for users
    const userIds = [...userMap.values()]
      .map(u => u.user_id)
      .filter(Boolean) as string[];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, is_premium, display_name")
        .in("user_id", userIds);

      for (const profile of profiles || []) {
        for (const [, entry] of userMap) {
          if (entry.user_id === profile.user_id) {
            entry.is_premium = profile.is_premium;
            entry.display_name = profile.display_name || "";
          }
        }
      }
    }

    // Count unique active users this month
    const uniqueMonthlyUsers = new Set(
      (monthlyLogs || []).map(l => l.user_id || l.device_id).filter(Boolean)
    ).size;
    const costPerActiveUser = uniqueMonthlyUsers > 0 ? monthlyCost / uniqueMonthlyUsers : 0;

    const response = {
      daily: {
        usage: dailyUsage,
        totalRequests: (dailyLogs || []).length,
        cost: {
          total: Math.round(dailyCost * 10000) / 10000,
          byType: Object.fromEntries(
            Object.entries(dailyCostByType).map(([k, v]) => [k, Math.round(v * 10000) / 10000])
          ),
        },
      },
      monthly: {
        usage: monthlyUsage,
        totalRequests: totalMonthlyRequests,
        cost: {
          total: Math.round(monthlyCost * 10000) / 10000,
          projected: Math.round(projectedMonthlyCost * 10000) / 10000,
          per1000Requests: Math.round(costPer1000 * 10000) / 10000,
          perActiveUser: Math.round(costPerActiveUser * 10000) / 10000,
          byType: Object.fromEntries(
            Object.entries(monthlyCostByType).map(([k, v]) => [k, Math.round(v * 10000) / 10000])
          ),
        },
        uniqueActiveUsers: uniqueMonthlyUsers,
        daysElapsed: dayOfMonth,
        daysInMonth,
      },
      perUser: [...userMap.values()],
      date: todayStr,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin usage stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
