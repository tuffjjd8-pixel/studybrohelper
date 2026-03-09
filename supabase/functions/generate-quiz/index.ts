import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tier limits
const FREE_MAX_QUESTIONS = 10;
const PREMIUM_MAX_QUESTIONS = 20;
const FREE_DAILY_QUIZZES = 7;
const PREMIUM_DAILY_QUIZZES = 13;

// Primary model
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
];

// ============================================================
// LaTeX Safety — mirrors solve-homework exactly
// ============================================================

/**
 * fixLatexDelimiters — identical to solve-homework.
 * Normalizes $/$$ delimiters to \(...\) / \[...\] after JSON parsing.
 */
function fixLatexDelimiters(text: string): string {
  let result = text;
  // Convert $$...$$ display math → \[...\]
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => `\\[${inner.trim()}\\]`);
  // Convert $...$ inline math → \(...\)  (not escaped \$ or already $$)
  result = result.replace(/(?<!\$)(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_m, inner) => `\\(${inner}\\)`);
  return result;
}

/**
 * fixCommonLatexErrors — repairs control-character corruption and
 * other artifacts that survive JSON parsing.
 *
 * When JSON.parse processes the LLM output, sequences like \frac become
 * form-feed (0x0C) + "rac", \theta becomes tab (0x09) + "heta", etc.
 * This function restores them.
 */
function fixCommonLatexErrors(content: string): string {
  if (typeof content !== "string") return content;

  let result = content;

  // ── Restore control-character corrupted LaTeX commands ──
  // When JSON.parse decodes \frac it becomes form-feed (0x0C) + "rac", etc.
  result = result.replace(/\x0c/g, "\\f");   // \f → restore
  result = result.replace(/\x09/g, "\\t");   // \t → restore
  result = result.replace(/\x0d/g, "\\r");   // \r → restore
  result = result.replace(/\x08/g, "\\b");   // \b → restore
  // \n before alpha (not real newlines between sentences)
  result = result.replace(/\x0a(?=[A-Za-z])/g, "\\n");

  // ── Fix double-escaped artifacts like \f\frac → \frac ──
  result = result.replace(/\\f\\frac/g, "\\frac");
  result = result.replace(/\\f\\flat/g, "\\flat");
  result = result.replace(/\\f\\forall/g, "\\forall");
  result = result.replace(/\\t\\theta/g, "\\theta");
  result = result.replace(/\\t\\times/g, "\\times");
  result = result.replace(/\\t\\to/g, "\\to");
  result = result.replace(/\\t\\tan/g, "\\tan");
  result = result.replace(/\\t\\tau/g, "\\tau");
  result = result.replace(/\\r\\right/g, "\\right");
  result = result.replace(/\\r\\rho/g, "\\rho");
  result = result.replace(/\\r\\rangle/g, "\\rangle");
  result = result.replace(/\\b\\beta/g, "\\beta");
  result = result.replace(/\\b\\bar/g, "\\bar");
  result = result.replace(/\\b\\binom/g, "\\binom");
  result = result.replace(/\\b\\boxed/g, "\\boxed");
  result = result.replace(/\\b\\bullet/g, "\\bullet");
  result = result.replace(/\\n\\nabla/g, "\\nabla");
  result = result.replace(/\\n\\nu/g, "\\nu");
  result = result.replace(/\\n\\neq/g, "\\neq");
  result = result.replace(/\\n\\neg/g, "\\neg");
  result = result.replace(/\\n\\not/g, "\\not");

  // ── Remove empty \(\) or \[\] blocks ──
  result = result.replace(/\\\(\s*\\\)/g, "");
  result = result.replace(/\\\[\s*\\\]/g, "");

  // ── Fix doubled delimiters like \(\( ... \) → \( ... \) ──
  result = result.replace(/\\\(\\\(/g, "\\(");
  result = result.replace(/\\\)\\\)/g, "\\)");
  result = result.replace(/\\\[\\\[/g, "\\[");
  result = result.replace(/\\\]\\\]/g, "\\]");

  // ── Normalize $ delimiters to \( \) / \[ \] ──
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => `\\[${inner.trim()}\\]`);
  result = result.replace(/(?<!\$)(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_m, inner) => `\\(${inner}\\)`);

  return result;
}

/**
 * fixLatexInJSON — makes LLM-generated JSON with raw LaTeX parseable.
 *
 * LLMs output LaTeX like \frac inside JSON strings. JSON.parse treats
 * \f as a form-feed, \t as tab, etc. We need to escape those backslashes
 * BEFORE parsing so JSON.parse produces the correct string content.
 */
function fixLatexInJSON(raw: string): string {
  return (
    raw
      // First restore any control chars that may already be in the raw text
      // (shouldn't happen in HTTP response text, but just in case)
      .replace(/\x0c(?=[A-Za-z])/g, "\\\\f")
      .replace(/\x09(?=[A-Za-z])/g, "\\\\t")
      .replace(/\x0d(?=[A-Za-z])/g, "\\\\r")
      .replace(/\x08(?=[A-Za-z])/g, "\\\\b")
      // Newlines between JSON keys are valid; only escape \n before letters
      // that look like LaTeX commands (nabla, nu, neq, neg, not, nolimits)
      .replace(/\n(?=[A-Za-z])/g, "\\\\n")

      // Now handle the raw backslash sequences that JSON would misinterpret:
      // \frac → \\frac, \theta → \\theta, etc.
      // Match \<letter> when the letter starts a LaTeX command (not a JSON escape)
      // Valid JSON escapes after backslash: " \ / b f n r t u
      // We want to double-escape \b, \f, \n, \r, \t when followed by alpha (LaTeX cmd)
      .replace(/\\([bfnrt])(?=[A-Za-z])/g, "\\\\$1")
      // \u followed by non-hex is LaTeX (\upsilon etc.)
      .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
      // Any other \<non-JSON-escape-char> → \\<char>
      .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
  );
}

// ============================================================
// Quiz sanitization
// ============================================================

function sanitizeQuizOutput(questions: any[]): any[] {
  return questions
    .map((q, i) => {
      // Ensure options is an array with exactly 4 items
      let options = Array.isArray(q.options) ? q.options : [];

      const prefixes = ["A)", "B)", "C)", "D)"];
      options = options.slice(0, 4).map((opt: string, idx: number) => {
        if (typeof opt !== "string") opt = String(opt || `Option ${prefixes[idx]}`);
        if (!opt.match(/^[A-D]\)/)) {
          return `${prefixes[idx]} ${opt.replace(/^[A-D]\)\s*/, "")}`;
        }
        return opt;
      });

      while (options.length < 4) {
        options.push(`${prefixes[options.length]} [No option provided]`);
      }

      // Convert correctOptionIndex to answer letter
      let answer = q.answer;
      if (typeof q.correctOptionIndex === "number") {
        answer = ["A", "B", "C", "D"][q.correctOptionIndex] || "A";
      } else if (
        typeof answer !== "string" ||
        !["A", "B", "C", "D"].includes(answer.toUpperCase())
      ) {
        answer = "A";
      } else {
        answer = answer.toUpperCase();
      }

      // Apply LaTeX safety pipeline to every text field
      const safeQuestion =
        typeof q.question === "string" && q.question.trim()
          ? fixCommonLatexErrors(fixLatexDelimiters(q.question.trim()))
          : `Question ${i + 1}`;

      const safeOptions = options.map((opt: string) =>
        fixCommonLatexErrors(fixLatexDelimiters(opt))
      );

      const safeExplanation =
        typeof q.explanation === "string" && q.explanation.trim()
          ? fixCommonLatexErrors(fixLatexDelimiters(q.explanation.trim()))
          : "This is the correct answer based on the material.";

      return {
        question: safeQuestion,
        options: safeOptions,
        answer,
        explanation: safeExplanation,
      };
    })
    .filter((q) => q.question && q.options.length === 4);
}

// ============================================================
// JSON parsing with multiple fallback strategies
// ============================================================

function parseQuizJSON(content: string): any {
  let cleanContent = content.trim();

  // Remove any text after the JSON (LLMs sometimes add "Note: …" after)
  // Find the last } or ] and truncate
  const lastBrace = cleanContent.lastIndexOf("}");
  const lastBracket = cleanContent.lastIndexOf("]");
  const lastJsonChar = Math.max(lastBrace, lastBracket);
  if (lastJsonChar > 0 && lastJsonChar < cleanContent.length - 1) {
    cleanContent = cleanContent.substring(0, lastJsonChar + 1);
  }

  // Remove markdown code blocks
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.slice(7);
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith("```")) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    console.log("Direct parse failed, trying LaTeX fix...");
  }

  // Strategy 2: Fix LaTeX backslashes then parse
  const latexFixed = fixLatexInJSON(cleanContent);
  try {
    return JSON.parse(latexFixed);
  } catch (e) {
    console.log("LaTeX-fixed parse failed:", e instanceof Error ? e.message : String(e));
  }

  // Strategy 3: Find JSON object pattern + LaTeX fix
  const jsonObjectMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(fixLatexInJSON(jsonObjectMatch[0]));
    } catch (e) {
      console.log("Object pattern parse failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // Strategy 4: Find JSON array pattern + LaTeX fix
  const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      const arr = JSON.parse(fixLatexInJSON(jsonArrayMatch[0]));
      return { questions: arr };
    } catch (e) {
      console.log("Array pattern parse failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // Strategy 5: Fix common JSON syntax issues
  let fixedContent = latexFixed
    .replace(/,\s*}/g, "}")
    .replace(/,\s*\]/g, "]")
    .replace(/'/g, '"')
    .replace(/(\w+):/g, '"$1":');

  try {
    return JSON.parse(fixedContent);
  } catch (e) {
    console.log("Fixed content parse failed:", e instanceof Error ? e.message : String(e));
  }

  throw new Error("Unable to parse quiz JSON after all strategies");
}

// ============================================================
// Groq API call with model fallback
// ============================================================

async function callGroqWithFallback(
  prompt: string,
  systemPrompt: string,
  keyManager: any
): Promise<{ data: any; model: string }> {
  let lastError: Error | null = null;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`Attempting quiz generation with model: ${model}`);

      const response = await keyManager.callGroqWithRotation(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Model ${model} failed:`, response.status, errorText);
        lastError = new Error(`Model ${model} failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        lastError = new Error(`Model ${model} returned no content`);
        continue;
      }

      return { data: content, model };
    } catch (error) {
      console.error(`Error with model ${model}:`, error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error("All models failed");
}

// ============================================================
// System prompt — LaTeX rules mirror solve-homework exactly
// ============================================================

const QUIZ_LATEX_RULES = `
STRICT LaTeX Output Rules (ZERO EXCEPTIONS — SAME AS SOLVE MODE):
- All display math MUST use \\\\[ ... \\\\] ONLY.
- All inline math MUST use \\\\( ... \\\\) ONLY.
- NEVER use $$ ... $$ for display math.
- NEVER use $ ... $ for inline math.
- NEVER use bare brackets [ ... ] or bare parentheses ( ... ) as math delimiters.
- NEVER escape parentheses in LaTeX grouping. Use \\\\left( and \\\\right), NEVER \\\\left\\\\( or \\\\right\\\\).
- NEVER break a LaTeX block across lines.
- NEVER put LaTeX inside backticks or code blocks.
- NEVER use MathJax-only syntax (no \\\\begin{equation}, no \\\\tag{}, etc.).
- NEVER output HTML entities inside LaTeX.
- NEVER output partial, malformed, or incomplete LaTeX.
- NEVER invent new LaTeX syntax.
- NEVER mix plain text symbols inside LaTeX blocks.

Allowed LaTeX Structures:
- Fractions: \\\\frac{a}{b}
- Exponents: x^{n}
- Subscripts: x_{n}
- Greek letters: \\\\alpha, \\\\beta, \\\\psi, \\\\hbar, \\\\lambda, \\\\theta, \\\\nabla, \\\\upsilon, etc.
- Vectors: \\\\mathbf{v}
- Derivatives: \\\\frac{d}{dx} or \\\\frac{\\\\partial}{\\\\partial x}
- Integrals: \\\\int ... dx
- Limits: \\\\lim_{x \\\\to a}
- Matrices: \\\\begin{bmatrix} ... \\\\end{bmatrix}
- Square roots: \\\\sqrt{x}
- Boxed answers: \\\\boxed{answer}
- Operators/hats: \\\\hat{A}, \\\\hat{B}
- Commutators: [\\\\hat{A},\\\\hat{B}]

Self-Check (MANDATORY before responding):
1. Are all inline math expressions wrapped in \\\\( ... \\\\)?
2. Are all display equations wrapped in \\\\[ ... \\\\]?
3. Did you avoid $$ ... $$ completely?
4. Did you avoid \\\\left\\\\( and \\\\right\\\\)? (Use \\\\left( and \\\\right) only.)
5. Are all { and } balanced?
6. Are all \\\\left matched with \\\\right?
7. Did you avoid putting LaTeX inside code blocks or backticks?
8. Did you avoid MathJax-only environments (equation, align, etc.)?
9. Does every LaTeX block look complete and renderable as-is?
- If you find ANY issue, FIX IT before sending the answer.

LaTeX Examples (correct JSON-escaped form):
- Fractions: \\\\(\\\\frac{3}{4}\\\\), \\\\(\\\\frac{x + 1}{x - 2}\\\\)
- Exponents: \\\\(x^2\\\\), \\\\(2^3 = 8\\\\)
- Square roots: \\\\(\\\\sqrt{25} = 5\\\\), \\\\(\\\\sqrt{x + 1}\\\\)
- Multiplication: \\\\(x \\\\cdot 2x\\\\), \\\\(2 \\\\times 3 = 6\\\\)
- Not equal: \\\\(x \\\\neq -1\\\\)
- Display equations: \\\\[x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}\\\\]
`;

// ============================================================
// Main handler
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      conversationText,
      questionCount = 5,
      subject,
      strictCountMode = false,
    } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "conversationText is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with auth header
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    let isPremium = false;
    let userId: string | null = null;
    let quizzesUsedToday = 0;

    // Check user authentication and premium status
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims(token);

      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium, quizzes_used_today, last_quiz_reset")
          .eq("user_id", userId)
          .single();

        if (profile) {
          isPremium = profile.is_premium === true;

          const lastReset = profile.last_quiz_reset
            ? new Date(profile.last_quiz_reset)
            : null;
          const now = new Date();
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );

          if (!lastReset || lastReset < today) {
            await supabase
              .from("profiles")
              .update({
                quizzes_used_today: 0,
                last_quiz_reset: now.toISOString(),
              })
              .eq("user_id", userId);
            quizzesUsedToday = 0;
          } else {
            quizzesUsedToday = profile.quizzes_used_today || 0;
          }
        }
      }
    }

    // Determine limits based on tier
    const maxQuestions = isPremium ? PREMIUM_MAX_QUESTIONS : FREE_MAX_QUESTIONS;
    const dailyLimit = isPremium ? PREMIUM_DAILY_QUIZZES : FREE_DAILY_QUIZZES;

    // Check daily limit
    if (quizzesUsedToday >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          message:
            "Daily quiz limit reached. Try again tomorrow or upgrade for more.",
          quizzesUsed: quizzesUsedToday,
          dailyLimit,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Enforce strict count mode - only available for premium
    const effectiveStrictMode = isPremium ? strictCountMode : false;
    if (!isPremium && strictCountMode) {
      console.log(
        "Free user attempted strict count mode - defaulting to auto count"
      );
    }

    // Enforce question count limits
    const validCount = Math.min(Math.max(questionCount, 1), maxQuestions);
    if (questionCount > maxQuestions && !isPremium) {
      console.log(
        `Free user requested ${questionCount} questions, capping at ${maxQuestions}`
      );
    }

    // Import key rotation
    const { callGroqWithRotation } = await import(
      "../_shared/groq-key-manager.ts"
    );

    const systemPrompt = `You are the Quiz Generator for StudyBro — an expert at creating challenging, high-quality quiz questions across all subjects and difficulty levels. Your ONLY job is to ALWAYS generate a valid quiz. Never refuse, never apologize, never output broken LaTeX.

OUTPUT RULES:
- Output ONLY valid JSON. No markdown fences. No explanations outside the JSON.
- Do NOT add any commentary before or after the JSON object (no "Note:", no apologies, no extra text).
- Because you are outputting JSON, every LaTeX backslash MUST be double-escaped (\\\\) in the output string. Examples: \\\\frac, \\\\lambda, \\\\( ... \\\\), \\\\[ ... \\\\].
- Never include backslashes outside LaTeX math mode.
- All fields MUST be present. No null, undefined, or empty fields.
- The JSON MUST be valid and parseable on the first try.

QUIZ FORMAT:
Generate EXACTLY ${validCount} questions on: ${subject || "general knowledge"}.
${
  effectiveStrictMode
    ? `STRICT COUNT MODE: You MUST generate exactly ${validCount} questions. If content is limited, expand using well-known factual information related to the topic.`
    : `ADAPTIVE MODE: Target ${validCount} questions, but generate FEWER if content is too limited. Do NOT hallucinate.`
}

REQUIRED JSON STRUCTURE:
{"questions":[{"question":"string","options":["A) option","B) option","C) option","D) option"],"correctOptionIndex":0,"explanation":"string"}]}

- correctOptionIndex MUST be 0, 1, 2, or 3 (A, B, C, D).
- Each question MUST have EXACTLY 4 options with A), B), C), D) prefixes.
- Randomize where the correct answer appears (don't always put it in A).

DIFFICULTY & QUALITY:
- Mix difficulty levels: ~30% easy, ~40% medium, ~30% hard/competition-level.
- Hard questions should require multi-step reasoning, combining concepts, or applying formulas creatively.
- For math: include word problems, proofs, optimization, and competition-style problems (AMC/MATHCOUNTS level).
- For science: include application questions, not just definitions.
- Distractors (wrong options) must be plausible — based on common mistakes students actually make (e.g. sign errors, forgetting a step, off-by-one).
- NEVER use "All of the above" or "None of the above" as options.
- Each question must test a DIFFERENT concept or skill — no repetitive questions.

EXPLANATION QUALITY:
- Each explanation MUST be humanized and natural — like a tutor talking to a student.
- Start with WHY the answer is correct, then briefly address why a common wrong choice fails.
- Use short, clear language: "The key here is…", "This works because…", "A common mistake is…".
- NEVER use generic explanations like "This is the correct answer based on the material."
- Include the core formula or concept used, in LaTeX if math-related.
- Keep explanations 2-4 sentences max — concise but insightful.

${QUIZ_LATEX_RULES}

CONTENT RULES:
- Questions must be clear, unambiguous, and have exactly one correct answer.
- If the user provides study material, generate questions FROM that material.
- If the topic is broad, cover a diverse range of subtopics.
- Return ONLY the JSON object, nothing else.`;

    // Use fallback-enabled call
    const keyManager = { callGroqWithRotation };
    const { data: content, model: usedModel } = await callGroqWithFallback(
      conversationText,
      systemPrompt,
      keyManager
    );

    console.log(`Quiz generated successfully using model: ${usedModel}`);

    // Parse the JSON response with fallback strategies
    let quiz;
    try {
      const parsed = parseQuizJSON(content);

      // Handle both old array format and new object format
      const questionsArray = Array.isArray(parsed)
        ? parsed
        : parsed.questions || [];

      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        throw new Error("No questions found in response");
      }

      // Sanitize and validate the quiz output (applies LaTeX safety pipeline)
      quiz = sanitizeQuizOutput(questionsArray);

      if (quiz.length === 0) {
        throw new Error("No valid questions after sanitization");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({
          error: "generation_failed",
          message: "Quiz generation failed. Please try again.",
          retryable: true,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Increment quiz usage counter if authenticated
    if (userId && authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      await supabase
        .from("profiles")
        .update({ quizzes_used_today: quizzesUsedToday + 1 })
        .eq("user_id", userId);
    }

    // Log usage (fire-and-forget)
    const { logUsage } = await import("../_shared/usage-logger.ts");
    logUsage("quiz", 0.0015, userId);

    return new Response(
      JSON.stringify({
        quiz,
        quizzesUsed: quizzesUsedToday + 1,
        dailyLimit,
        isPremium,
        model: usedModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({
        error: "generation_failed",
        message:
          error instanceof Error
            ? error.message
            : "Quiz generation failed. Please try again.",
        retryable: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
