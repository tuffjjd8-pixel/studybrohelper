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
        ? q.question.trim() 
        : `Question ${i + 1}`,
      options,
      answer,
      explanation: typeof q.explanation === 'string' && q.explanation.trim()
        ? q.explanation.trim()
        : "This is the correct answer based on the material.",
    };
  }).filter(q => q.question && q.options.length === 4);
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
    console.log("Direct parse failed, trying fallbacks...");
  }

  // Strategy 3: Find JSON object pattern
  const jsonObjectMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch (e) {
      console.log("Object pattern parse failed");
    }
  }

  // Strategy 4: Find JSON array pattern
  const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      const arr = JSON.parse(jsonArrayMatch[0]);
      return { questions: arr };
    } catch (e) {
      console.log("Array pattern parse failed");
    }
  }

  // Strategy 5: Fix common JSON issues
  let fixedContent = cleanContent
    .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
    .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
    .replace(/'/g, '"')       // Replace single quotes with double
    .replace(/(\w+):/g, '"$1":'); // Add quotes to unquoted keys
  
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

    const systemPrompt = `You are a quiz generator. Your ONLY job is to produce clean, valid JSON quizzes.

STRICT RULES:
1. Generate EXACTLY ${validCount} multiple-choice questions based on the provided content.
2. Questions may include math symbols (λ, Δx, hf, etc.) ONLY if they render cleanly. If a symbol cannot be rendered correctly, replace it with word form (lambda, delta x, h f). NEVER output broken LaTeX or half-rendered math.
3. Difficulty context: ${subject || "general"}
4. Include ONLY short explanations (1-2 sentences max). NO step-by-step solutions.
5. Return ONLY the JSON object. NO extra text before or after.
6. NO markdown formatting.
7. NO LaTeX formatting ($, \\, ^, _, {}).
8. All fields MUST be present. No missing keys. No null values.
9. The JSON MUST be valid and parseable on the first try.
10. Each question MUST have EXACTLY 4 options labeled A), B), C), D).
11. correctOptionIndex MUST be 0, 1, 2, or 3 (corresponding to A, B, C, D).
${effectiveStrictMode ? `12. STRICT COUNT MODE: You MUST generate exactly ${validCount} questions. If the content is limited, expand using well-known, factual information related to the topic. Do NOT invent fake facts.` : `12. ADAPTIVE MODE: Target ${validCount} questions, but generate FEWER if content is too limited. Do NOT hallucinate.`}

REQUIRED JSON STRUCTURE (return EXACTLY this format):
{"questions":[{"question":"string","options":["A) option","B) option","C) option","D) option"],"correctOptionIndex":0,"explanation":"short explanation"}]}

- correctOptionIndex is 0 for A, 1 for B, 2 for C, 3 for D
- options must have exactly 4 items with A), B), C), D) prefixes
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
