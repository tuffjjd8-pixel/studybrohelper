import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fixLatexDelimiters, fixCommonLatexErrors, fixLatexInJSON } from "../_shared/latex-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_MAX_QUESTIONS = 10;
const PREMIUM_MAX_QUESTIONS = 20;
const FREE_DAILY_QUIZZES = 7;
const PREMIUM_DAILY_QUIZZES = 13;

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

const SUBJECT_FALLBACKS: Record<string, string> = {
  math: "General Math Skills", algebra: "Algebra", geometry: "Geometry",
  calculus: "Calculus", trigonometry: "Trigonometry", statistics: "Statistics and Probability",
  science: "General Science Concepts", physics: "Physics Fundamentals",
  chemistry: "Chemistry Fundamentals", biology: "Biology Fundamentals",
  english: "Reading Comprehension", history: "World History Basics",
  geography: "World Geography", economics: "Basic Economic Principles",
  psychology: "Psychology Fundamentals", computer: "Computer Science Basics",
};

function sanitizeSubject(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "General Knowledge";
  let clean = raw
    .replace(/\\\(|\\\)|\\\[|\\\]|\$\$/g, "")
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}^_\n\r\t\f]/g, " ")
    .replace(/[^a-zA-Z0-9\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = clean.toLowerCase();
  if (!clean || lower === "other" || lower === "general" || lower === "topic" || lower === "quiz" || clean.length < 2) {
    const origLower = (raw || "").toLowerCase();
    for (const [key, fallback] of Object.entries(SUBJECT_FALLBACKS)) {
      if (origLower.includes(key)) return fallback;
    }
    return "General Knowledge";
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ============================================================
// Quiz sanitization
// ============================================================

function sanitizeQuizOutput(questions: any[]): any[] {
  const sanitized = questions
    .map((q, i) => {
      let options = Array.isArray(q.options) ? q.options : [];
      const prefixes = ["A)", "B)", "C)", "D)"];
      options = options.slice(0, 4).map((opt: string, idx: number) => {
        if (typeof opt !== "string") opt = String(opt || `Option ${prefixes[idx]}`);
        if (!opt.match(/^[A-D]\)/)) return `${prefixes[idx]} ${opt.replace(/^[A-D]\)\s*/, "")}`;
        return opt;
      });
      while (options.length < 4) options.push(`${prefixes[options.length]} [No option provided]`);

      let answer = q.answer;
      if (typeof q.correctOptionIndex === "number") {
        answer = ["A", "B", "C", "D"][q.correctOptionIndex] || "A";
      } else if (typeof answer !== "string" || !["A", "B", "C", "D"].includes(answer.toUpperCase())) {
        answer = "A";
      } else {
        answer = answer.toUpperCase();
      }

      const preClean = (s: string) => s.replace(/Schr[\\()öo\s]*(ö|o)[\\()]*dinger/gi, "Schrödinger");

      const safeQuestion = typeof q.question === "string" && q.question.trim()
        ? fixCommonLatexErrors(fixLatexDelimiters(preClean(q.question.trim())))
        : `Question ${i + 1}`;
      const safeOptions = options.map((opt: string) => fixCommonLatexErrors(fixLatexDelimiters(preClean(opt))));
      const safeExplanation = typeof q.explanation === "string" && q.explanation.trim()
        ? fixCommonLatexErrors(fixLatexDelimiters(preClean(q.explanation.trim())))
        : "This is the correct answer based on the material.";

      return { question: safeQuestion, options: safeOptions, answer, explanation: safeExplanation };
    })
    .filter((q) => q.question && q.options.length === 4);

  // Balance answer distribution
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const q of sanitized) counts[q.answer]++;
  const total = sanitized.length;
  const maxPerLetter = Math.max(Math.ceil(total / 4) + 1, 2);

  if (total >= 4) {
    for (let i = 0; i < sanitized.length; i++) {
      const q = sanitized[i];
      const letter = q.answer;
      if (counts[letter] > maxPerLetter) {
        const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
        const leastUsed = sorted[0][0];
        const leastIdx = ["A", "B", "C", "D"].indexOf(leastUsed);
        const currentIdx = ["A", "B", "C", "D"].indexOf(letter);
        const temp = q.options[currentIdx];
        q.options[currentIdx] = q.options[leastIdx];
        q.options[leastIdx] = temp;
        const pf = ["A)", "B)", "C)", "D)"];
        q.options = q.options.map((opt: string, idx: number) => {
          const stripped = opt.replace(/^[A-D]\)\s*/, "");
          return `${pf[idx]} ${stripped}`;
        });
        q.answer = leastUsed;
        counts[letter]--;
        counts[leastUsed]++;
      }
    }
  }

  return sanitized;
}

// ============================================================
// JSON parsing with multiple fallback strategies
// ============================================================

function parseQuizJSON(content: string): any {
  let c = content.trim();
  const lastJson = Math.max(c.lastIndexOf("}"), c.lastIndexOf("]"));
  if (lastJson > 0 && lastJson < c.length - 1) c = c.substring(0, lastJson + 1);
  if (c.startsWith("```json")) c = c.slice(7);
  else if (c.startsWith("```")) c = c.slice(3);
  if (c.endsWith("```")) c = c.slice(0, -3);
  c = c.trim();

  try { return JSON.parse(c); } catch (_) {}
  const lf = fixLatexInJSON(c);
  try { return JSON.parse(lf); } catch (_) {}
  const om = c.match(/\{[\s\S]*\}/);
  if (om) { try { return JSON.parse(fixLatexInJSON(om[0])); } catch (_) {} }
  const am = c.match(/\[[\s\S]*\]/);
  if (am) { try { return { questions: JSON.parse(fixLatexInJSON(am[0])) }; } catch (_) {} }
  let fc = lf.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]").replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
  try { return JSON.parse(fc); } catch (_) {}
  throw new Error("Unable to parse quiz JSON after all strategies");
}

// ============================================================
// Groq + Lovable AI fallback
// ============================================================

const LOVABLE_AI_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

async function callLovableAI(prompt: string, systemPrompt: string, model: string): Promise<{ data: string; model: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  console.log(`Attempting Lovable AI fallback with model: ${model}`);
  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.3, max_tokens: 4000 }),
  });
  if (!response.ok) { const t = await response.text(); throw new Error(`Lovable AI ${model} failed: ${response.status} - ${t}`); }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Lovable AI ${model} returned no content`);
  return { data: content, model: `lovable/${model}` };
}

async function callGroqWithFallback(prompt: string, systemPrompt: string, keyManager: any): Promise<{ data: any; model: string }> {
  let lastError: Error | null = null;
  for (const model of GROQ_MODELS) {
    try {
      console.log(`Groq attempt with model: ${model}`);
      const response = await keyManager.callGroqWithRotation("https://api.groq.com/openai/v1/chat/completions", {
        model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.3, max_tokens: 4000,
      });
      if (!response.ok) { lastError = new Error(`Groq ${model} failed: ${response.status}`); continue; }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content || (!content.includes("{") && !content.includes("["))) { lastError = new Error(`Groq ${model} returned non-JSON`); continue; }
      return { data: content, model };
    } catch (error) { lastError = error as Error; }
  }
  console.log("All Groq attempts failed, falling back to Lovable AI...");
  for (const model of LOVABLE_AI_MODELS) {
    try { return await callLovableAI(prompt, systemPrompt, model); } catch (error) { lastError = error as Error; }
  }
  throw lastError || new Error("All models failed");
}

// ============================================================
// System prompt
// ============================================================

const QUIZ_LATEX_RULES = `
LaTeX Rules:
- Display math: \\\\[ ... \\\\] only. Inline math: \\\\( ... \\\\) only.
- NEVER use $$ or $ delimiters. Double-escape all backslashes in JSON.
- Keep all LaTeX complete and renderable.`;

// ============================================================
// Main handler
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversationText, questionCount = 5, subject: rawSubject, strictCountMode = false } = await req.json();
    const subject = sanitizeSubject(rawSubject);
    console.log(`Sanitized subject: "${rawSubject}" → "${subject}"`);

    if (!conversationText) {
      return new Response(JSON.stringify({ error: "conversationText is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    let isPremium = false;
    let userId: string | null = null;
    let quizzesUsedToday = 0;

    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;
        const { data: profile } = await supabase.from("profiles").select("is_premium, quizzes_used_today, last_quiz_reset").eq("user_id", userId).single();
        if (profile) {
          isPremium = profile.is_premium === true;
          const lastReset = profile.last_quiz_reset ? new Date(profile.last_quiz_reset) : null;
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (!lastReset || lastReset < today) {
            await supabase.from("profiles").update({ quizzes_used_today: 0, last_quiz_reset: now.toISOString() }).eq("user_id", userId);
            quizzesUsedToday = 0;
          } else { quizzesUsedToday = profile.quizzes_used_today || 0; }
        }
      }
    }

    const maxQuestions = isPremium ? PREMIUM_MAX_QUESTIONS : FREE_MAX_QUESTIONS;
    const dailyLimit = isPremium ? PREMIUM_DAILY_QUIZZES : FREE_DAILY_QUIZZES;
    if (quizzesUsedToday >= dailyLimit) {
      return new Response(JSON.stringify({ error: "daily_limit_reached", message: "Daily quiz limit reached.", quizzesUsed: quizzesUsedToday, dailyLimit }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const effectiveStrictMode = isPremium ? strictCountMode : false;
    const validCount = Math.min(Math.max(questionCount, 1), maxQuestions);

    const { callGroqWithRotation } = await import("../_shared/groq-key-manager.ts");

    const systemPrompt = `You are a quiz generator. Output ONLY valid JSON. No markdown fences, no commentary.
Double-escape all LaTeX backslashes (\\\\frac, \\\\theta, etc.) since output is JSON.

Generate EXACTLY ${validCount} questions on: ${subject}.
${effectiveStrictMode ? `STRICT: exactly ${validCount} questions. Expand with related facts if needed.` : `ADAPTIVE: target ${validCount}, generate fewer if content is limited.`}

JSON structure: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctOptionIndex":0,"explanation":"..."}]}
- correctOptionIndex: 0-3. Randomize correct answer position. Distribute roughly evenly.
- 4 options each with A)/B)/C)/D) prefixes. All distinct, plausible distractors.
- Mix difficulty: 30% easy, 40% medium, 30% hard. Each question tests a different concept.
- Explanations: 2-4 sentences, natural tutor tone. Start with WHY the answer is correct.
- No "All/None of the above". No generic explanations.
${QUIZ_LATEX_RULES}`;

    const keyManager = { callGroqWithRotation };
    const { data: content, model: usedModel } = await callGroqWithFallback(conversationText, systemPrompt, keyManager);
    console.log(`Quiz generated using model: ${usedModel}`);

    let quiz;
    try {
      const parsed = parseQuizJSON(content);
      const questionsArray = Array.isArray(parsed) ? parsed : parsed.questions || [];
      if (!Array.isArray(questionsArray) || questionsArray.length === 0) throw new Error("No questions found");
      quiz = sanitizeQuizOutput(questionsArray);
      if (quiz.length === 0) throw new Error("No valid questions after sanitization");
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(JSON.stringify({ error: "generation_failed", message: "Quiz generation failed. Please try again.", retryable: true }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (userId && authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      await supabase.from("profiles").update({ quizzes_used_today: quizzesUsedToday + 1 }).eq("user_id", userId);
    }

    const { logUsage } = await import("../_shared/usage-logger.ts");
    logUsage("quiz", 0.0015, userId);

    return new Response(JSON.stringify({ quiz, quizzesUsed: quizzesUsedToday + 1, dailyLimit, isPremium, model: usedModel }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(JSON.stringify({ error: "generation_failed", message: error instanceof Error ? error.message : "Quiz generation failed.", retryable: true }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
