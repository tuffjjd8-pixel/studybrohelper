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

// Primary model for all text/reasoning (NO instant models)
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile", // Primary and only model
];

// Sanitize and validate quiz output
function sanitizeQuizOutput(questions: any[]): any[] {
  return questions.map((q, i) => {
    // Ensure options is an array with exactly 4 items
    let options = Array.isArray(q.options) ? q.options : [];
    
    // Ensure each option has proper A/B/C/D prefix
    const prefixes = ['A)', 'B)', 'C)', 'D)'];
    options = options.slice(0, 4).map((opt: string, idx: number) => {
      if (typeof opt !== 'string') opt = String(opt || `Option ${prefixes[idx]}`);
      // If option doesn't start with letter prefix, add it
      if (!opt.match(/^[A-D]\)/)) {
        return `${prefixes[idx]} ${opt.replace(/^[A-D]\)\s*/, '')}`;
      }
      return opt;
    });
    
    // Pad with placeholder options if less than 4
    while (options.length < 4) {
      options.push(`${prefixes[options.length]} [No option provided]`);
    }

    // Convert correctOptionIndex to answer letter
    let answer = q.answer;
    if (typeof q.correctOptionIndex === 'number') {
      answer = ['A', 'B', 'C', 'D'][q.correctOptionIndex] || 'A';
    } else if (typeof answer !== 'string' || !['A', 'B', 'C', 'D'].includes(answer.toUpperCase())) {
      answer = 'A'; // Default to A if invalid
    } else {
      answer = answer.toUpperCase();
    }

    return {
      question: typeof q.question === 'string' && q.question.trim() 
        ? fixCommonLatexErrors(q.question.trim())
        : `Question ${i + 1}`,
      options: options.map(opt => fixCommonLatexErrors(opt)),
      answer,
      explanation: typeof q.explanation === 'string' && q.explanation.trim()
        ? fixCommonLatexErrors(q.explanation.trim())
        : "This is the correct answer based on the material.",
    };
  }).filter(q => q.question && q.options.length === 4);
}

// Fix LaTeX inside JSON returned by the LLM.
// IMPORTANT: The Groq API response itself is JSON; sequences like "\frac" may already have been
// decoded into control characters (e.g. \f form-feed) *before* we ever see `content`.
// We must first restore those into backslash-commands, then make the JSON parseable.
function fixLatexInJSON(raw: string): string {
  const restored = raw
    // Restore control characters that commonly come from JSON-decoding LaTeX commands
    // \f in "\frac" -> form feed (0x0c) + "rac"; restore to "\\frac" in the JSON text
    .replace(/\x0c(?=[A-Za-z])/g, "\\\\f")
    // \t in "\theta", "\times", "\to" -> tab (0x09)
    .replace(/\x09(?=[A-Za-z])/g, "\\\\t")
    // \n in "\nabla", etc. -> newline (0x0a)
    .replace(/\x0a(?=[A-Za-z])/g, "\\\\n")
    // \r in "\rho", "\right" -> carriage return (0x0d)
    .replace(/\x0d(?=[A-Za-z])/g, "\\\\r")
    // \b in "\beta", "\bar", etc. -> backspace (0x08)
    .replace(/\x08(?=[A-Za-z])/g, "\\\\b");

  return restored
    // \u is a JSON unicode escape; escape it unless it's followed by 4 hex digits
    .replace(/(?<!\\)\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
    // \f, \t, \n, \r, \b are JSON escapes; escape them when they start LaTeX commands
    .replace(/(?<!\\)\\([bfnrt])(?=[A-Za-z])/g, "\\\\$1")
    // Escape every other backslash that isn't a valid JSON escape start
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

// Post-process quiz to fix common LaTeX errors
function fixCommonLatexErrors(content: string): string {
  if (typeof content !== 'string') return content;
  
  return content
    // Fix missing backslash in \frac and clean up any form feeds (\f -> \x0c) parsed by accident
    .replace(/\x0crac\{/g, '\\frac{')
    .replace(/([^\\])rac\{/g, '$1\\frac{')
    .replace(/^rac\{/g, '\\frac{')
    
    // Fix \theta which might have been parsed as tab (\t -> \x09) + heta
    .replace(/\x09heta/g, '\\theta')
    
    // Fix \times which might have been parsed as tab (\t -> \x09) + imes
    .replace(/\x09imes/g, '\\times')
    
    // Fix \right which might have been parsed as carriage return (\r -> \x0d) + ight
    .replace(/\x0dight/g, '\\right')

    // Fix missing delimiters ( ... ) -> \( ... \) if it contains LaTeX commands and isn't already escaped
    .replace(/(^|[^\\])\(([^)]*(?:\\[a-zA-Z]+|\^|_|\\{)[^)]*)\)(?!\S)/g, (match, before, inner) => {
      return `${before}\\(${inner}\\)`;
    })
    
    // Fix standalone math expressions missing delimiters
    .replace(/([A-Za-z]\))\s*([\\][a-zA-Z]+|[\\][()]|[\\]\[|[\\]\]|\{[^}]*\})/g, '$1 \\($2\\)')
    
    // Ensure proper spacing around delimiters
    .replace(/\\\(\s*/g, '\\(')
    .replace(/\s*\\\)/g, '\\)')
    .replace(/\\\[\s*/g, '\\[')
    .replace(/\s*\\\]/g, '\\]');
}

// Parse JSON with multiple fallback strategies
function parseQuizJSON(content: string): any {
  let cleanContent = content.trim();
  
  // Strategy 1: Remove markdown code blocks
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.slice(7);
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith("```")) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  // Strategy 2: Try direct parse
  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    console.log("Direct parse failed, trying LaTeX fix...");
  }

  // Strategy 3: Fix LaTeX backslashes then parse
  const latexFixed = fixLatexInJSON(cleanContent);
  try {
    return JSON.parse(latexFixed);
  } catch (e) {
    console.log(
      "LaTeX-fixed parse failed:",
      e instanceof Error ? e.message : String(e),
      "— trying pattern extraction..."
    );
  }

  // Strategy 4: Find JSON object pattern + LaTeX fix
  const jsonObjectMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(fixLatexInJSON(jsonObjectMatch[0]));
    } catch (e) {
      console.log("Object pattern parse failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // Strategy 5: Find JSON array pattern + LaTeX fix
  const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      const arr = JSON.parse(fixLatexInJSON(jsonArrayMatch[0]));
      return { questions: arr };
    } catch (e) {
      console.log("Array pattern parse failed");
    }
  }

  // Strategy 6: Fix common JSON issues
  let fixedContent = latexFixed
    .replace(/,\s*}/g, '}')
    .replace(/,\s*\]/g, ']')
    .replace(/'/g, '"')
    .replace(/(\w+):/g, '"$1":');
  
  try {
    return JSON.parse(fixedContent);
  } catch (e) {
    console.log("Fixed content parse failed");
  }

  throw new Error("Unable to parse quiz JSON after all strategies");
}

// Call Groq with model fallback
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationText, questionCount = 5, subject, strictCountMode = false } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "conversationText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with auth header
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    let isPremium = false;
    let userId: string | null = null;
    let quizzesUsedToday = 0;

    // Check user authentication and premium status
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium, quizzes_used_today, last_quiz_reset")
          .eq("user_id", userId)
          .single();

        if (profile) {
          isPremium = profile.is_premium === true;
          
          // Check if we need to reset the daily counter
          const lastReset = profile.last_quiz_reset ? new Date(profile.last_quiz_reset) : null;
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (!lastReset || lastReset < today) {
            // Reset counter for new day
            await supabase
              .from("profiles")
              .update({ quizzes_used_today: 0, last_quiz_reset: now.toISOString() })
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
          message: "Daily quiz limit reached. Try again tomorrow or upgrade for more.",
          quizzesUsed: quizzesUsedToday,
          dailyLimit
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce strict count mode - only available for premium
    const effectiveStrictMode = isPremium ? strictCountMode : false;
    if (!isPremium && strictCountMode) {
      console.log("Free user attempted strict count mode - defaulting to auto count");
    }

    // Enforce question count limits
    let validCount = Math.min(Math.max(questionCount, 1), maxQuestions);
    if (questionCount > maxQuestions && !isPremium) {
      console.log(`Free user requested ${questionCount} questions, capping at ${maxQuestions}`);
    }

    // Import key rotation
    const { callGroqWithRotation } = await import("../_shared/groq-key-manager.ts");

    const systemPrompt = `You are the Quiz Generator for StudyBro — an expert at creating challenging, high-quality quiz questions across all subjects and difficulty levels. Your ONLY job is to ALWAYS generate a valid quiz. Never refuse, never apologize, never output broken LaTeX.

OUTPUT RULES:
- Output ONLY valid JSON. No markdown fences. No explanations outside the JSON.
- Do NOT add any commentary before/after the JSON (no "Note:", no apologies, no extra text).
- Because you are outputting JSON, every LaTeX backslash MUST be written as \\ in the JSON text (examples: \\frac, \\lambda, \\( ... \\), \\[ ... \\]).
- Never include backslashes outside LaTeX math mode.
- All fields MUST be present. No null, undefined, or empty fields.
- The JSON MUST be valid and parseable on the first try.

QUIZ FORMAT:
Generate EXACTLY ${validCount} questions on: ${subject || "general knowledge"}.
${effectiveStrictMode ? `STRICT COUNT MODE: You MUST generate exactly ${validCount} questions. If content is limited, expand using well-known factual information related to the topic.` : `ADAPTIVE MODE: Target ${validCount} questions, but generate FEWER if content is too limited. Do NOT hallucinate.`}

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

LATEX RULES (KaTeX-SAFE):
- Use LaTeX ONLY inside inline math delimiters: \\( ... \\)
- For display-level math in questions, use \\[ ... \\] delimiters.
- Use KaTeX-safe syntax only: \\frac, \\sqrt, ^, _, \\cdot, \\times, \\pm, \\leq, \\geq, \\neq.
- Do NOT use \\begin{align}, \\begin{cases}, \\text{}, or any environments.
- Never generate multi-line LaTeX inside a single delimiter.

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
      const questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      
      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        throw new Error("No questions found in response");
      }

      // Sanitize and validate the quiz output
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
          retryable: true
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment quiz usage counter if authenticated
    if (userId && authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
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
        model: usedModel
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "generation_failed",
        message: error instanceof Error ? error.message : "Quiz generation failed. Please try again.",
        retryable: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
