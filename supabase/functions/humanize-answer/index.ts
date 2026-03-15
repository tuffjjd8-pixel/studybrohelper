import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_MODEL = "openai/gpt-oss-120b";

const BASE_PROMPT = `Rewrite the text so it sounds like a real student wrote it — natural, conversational, and genuine.

CORE RULES:
- Keep the original meaning, facts, and math EXACTLY the same.
- Do not add new information or remove important details.
- Do NOT shorten full essays — keep the full original length.
- Only condense overly wordy internal sentences, not entire sections.

HUMANIZATION:
- Replace robotic patterns: "It is important to note that" → just state the point. "Furthermore" → "Also" or "On top of that". "In conclusion" → "So basically" or "To wrap up". "This demonstrates that" → "This shows" or "So we can see".
- Vary sentence length naturally. Mix short punchy sentences with slightly longer ones.
- Use contractions where natural: "it's", "that's", "doesn't", "we've".
- Add natural filler sparingly: "basically", "pretty much", "so yeah", "honestly".
- Break up long paragraphs into shorter, more readable chunks.
- Use a casual but intelligent tone — like a student who understands the material well.
- Avoid over-polished academic language that no student would naturally write.

MATH & FORMATTING:
- Keep all LaTeX math formatting EXACTLY the same ($$...$$, $...$, \\(...\\), \\[...\\]).
- Do not modify, reformat, or "fix" any math expressions.
- Do not add errors or change any calculations.

OUTPUT: Return ONLY the rewritten text. No commentary, no meta-text.`;

const MODE_MODIFIERS: Record<string, string> = {
  soft: "Light rewrite only. Keep the structure and most phrasing the same. Just fix the most obviously robotic sentences and smooth out awkward flow. Minimal changes.",
  medium: "Moderate rewrite. Improve sentence flow and naturalness throughout. Restructure some sentences and replace academic phrasing, but keep the overall organization intact.",
  strong: "Full rewrite in a natural student voice. Restructure paragraphs, simplify explanations, replace all academic/AI phrasing with casual language. Maximum naturalness while keeping all meaning.",
  auto: "Automatically choose rewriting strength based on text length and how robotic it sounds: Short answers (under 300 words) → Strong rewrite. Medium length (300-800 words) → Medium rewrite. Long essays (over 800 words) → Soft to Medium to preserve structure. If the text already sounds natural, use Soft regardless of length.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solution, subject, action, humanize_strength, answerLanguage = "en" } = await req.json();

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

    let systemPrompt = `${BASE_PROMPT}

Mode: ${strength}

Instructions:
${MODE_MODIFIERS[strength]}`;

    // Inject answer language
    if (answerLanguage && answerLanguage !== "en") {
      systemPrompt += `\n\nLANGUAGE: The rewritten text must be in ${answerLanguage}. Keep all LaTeX math formatting unchanged.`;
    }

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
