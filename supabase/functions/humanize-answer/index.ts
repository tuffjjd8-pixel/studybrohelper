import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_MODEL = "llama-3.3-70b-versatile";

const BASE_PROMPT = `Rewrite the text to sound fully human and natural.

Keep the original meaning exactly.
Do not add new information.
Do not remove important details.
Do NOT shorten full essays — keep the full original length.
Only shorten overly long internal explanations.
Avoid robotic, academic, or AI-style phrasing.
Remove patterns like "It is important to note that", "Furthermore", "In conclusion", "This demonstrates that".
Use natural flow, varied sentence length, and realistic tone.
Break up long paragraphs into shorter natural ones.
Make it sound like a real student wrote it.
Keep all LaTeX math formatting exactly the same ($$...$$ and $...$).
Do not add errors or change math.

OUTPUT: Return ONLY the rewritten text. No commentary.`;

const MODE_MODIFIERS: Record<string, string> = {
  soft: "Light rewrite. Keep structure mostly the same. Fix robotic phrasing and awkward flow. Minimal structural changes.",
  medium: "Rewrite more naturally. Improve sentence flow, clarity, and structure. Restructure some sentences but keep overall organization.",
  strong: "Fully rewrite in a natural human style. Restructure paragraphs and simplify explanations without losing meaning. Maximum naturalness.",
  auto: "Automatically choose the best rewriting strength based on text length: Short answers (under 300 words) → use Strong rewriting. Medium length (300-800 words) → use Medium rewriting. Long essays (over 800 words) → use Soft to Medium rewriting to preserve structure.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solution, subject, action, humanize_strength } = await req.json();

    // Auth check
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
      return new Response(
        JSON.stringify({ canHumanize: isPremium, isPremiumRequired: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium-only gate
    if (!isPremium) {
      return new Response(
        JSON.stringify({ error: "premium_required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!solution) {
      return new Response(
        JSON.stringify({ error: "No solution provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { callGroqWithRotation } = await import("../_shared/groq-key-manager.ts");

    const strength: string = humanize_strength && MODE_MODIFIERS[humanize_strength] ? humanize_strength : "auto";
    console.log("Humanize request — subject:", subject, "strength:", strength);

    const systemPrompt = `${BASE_PROMPT}

Mode: ${strength}

Instructions:
${MODE_MODIFIERS[strength]}`;

    const response = await callGroqWithRotation(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Rewrite this ${subject || "homework"} solution:\n\n${solution}` },
        ],
        temperature: strength === "strong" ? 0.9 : strength === "soft" ? 0.6 : 0.75,
        max_tokens: 4000,
      }
    );

    const data = await response.json();
    const humanized = data.choices?.[0]?.message?.content || solution;

    console.log("Humanize completed successfully");

    // Log usage (fire-and-forget)
    const { logUsage } = await import("../_shared/usage-logger.ts");
    logUsage("humanize", 0.0010, userId);

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
