import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_MODEL = "llama-3.3-70b-versatile";
const FREE_HUMANIZE_PER_DAY = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solution, subject, action } = await req.json();

    // Auth check (optional - guests can humanize too)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isPremium = false;

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", user.id)
          .single();
        isPremium = profile?.is_premium ?? false;
      }
    }

    // Action: check usage
    if (action === "check") {
      if (isPremium) {
        return new Response(
          JSON.stringify({ canHumanize: true, used: 0, max: -1 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const deviceId = req.headers.get("x-device-id");
      const used = getUsageFromMemory(userId, deviceId);
      return new Response(
        JSON.stringify({
          canHumanize: used < FREE_HUMANIZE_PER_DAY,
          used,
          max: FREE_HUMANIZE_PER_DAY,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check limits for free users
    if (!isPremium) {
      const deviceId = req.headers.get("x-device-id");
      const used = getUsageFromMemory(userId, deviceId);
      if (used >= FREE_HUMANIZE_PER_DAY) {
        return new Response(
          JSON.stringify({ error: "limit_reached", used, max: FREE_HUMANIZE_PER_DAY }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      incrementUsage(userId, deviceId);
    }

    if (!solution) {
      return new Response(
        JSON.stringify({ error: "No solution provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { callGroqWithRotation } = await import("../_shared/groq-key-manager.ts");

    console.log("Humanize request for subject:", subject);

    const systemPrompt = `You are a student rewriting an AI-generated homework solution to sound like a real student wrote it. Keep the same meaning, math, and accuracy but:
- Use casual, natural language a student would use
- Add small filler words or transitions ("so basically", "then we just", "which gives us")
- Vary sentence length naturally
- Keep all LaTeX math formatting exactly the same ($$...$$ and $...$)
- Keep all steps and logic intact
- Don't add errors or change the math
- Don't say "I" too much
- Make it sound like handwritten notes converted to text
- Keep it roughly the same length`;

    const response = await callGroqWithRotation(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Rewrite this ${subject || "homework"} solution in a natural student voice:\n\n${solution}` },
        ],
        temperature: 0.8,
        max_tokens: 3000,
      }
    );

    const data = await response.json();
    const humanized = data.choices?.[0]?.message?.content || solution;

    console.log("Humanize completed successfully");

    // Log usage for admin dashboard
    try {
      const { createClient: createAdminClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createAdminClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await adminClient.from("api_usage_logs").insert({
        user_id: userId, request_type: "humanize", estimated_cost: 0.002,
      });
    } catch (logErr) { console.error("Usage log error:", logErr); }

    return new Response(
      JSON.stringify({ humanized }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in humanize-answer:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simple in-memory usage tracking (resets on cold start, but sufficient for rate limiting)
const usageMap = new Map<string, { count: number; date: string }>();

function getTodayCST(): string {
  const now = new Date();
  const cst = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return cst.toISOString().split("T")[0];
}

function getUsageKey(userId: string | null, deviceId: string | null): string {
  return userId || deviceId || "anonymous";
}

function getUsageFromMemory(userId: string | null, deviceId: string | null): number {
  const key = getUsageKey(userId, deviceId);
  const today = getTodayCST();
  const entry = usageMap.get(key);
  if (!entry || entry.date !== today) return 0;
  return entry.count;
}

function incrementUsage(userId: string | null, deviceId: string | null): void {
  const key = getUsageKey(userId, deviceId);
  const today = getTodayCST();
  const entry = usageMap.get(key);
  if (!entry || entry.date !== today) {
    usageMap.set(key, { count: 1, date: today });
  } else {
    entry.count++;
  }
}
