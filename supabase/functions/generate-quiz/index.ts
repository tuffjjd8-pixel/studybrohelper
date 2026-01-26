import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier limits
const FREE_MAX_QUESTIONS = 10;
const PREMIUM_MAX_QUESTIONS = 20;
const FREE_DAILY_QUIZZES = 7;
const PREMIUM_DAILY_QUIZZES = 13;

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

    const systemPrompt = effectiveStrictMode 
      ? `Generate EXACTLY ${validCount} multiple-choice questions based on the provided content.

STRICT COUNT MODE IS ON:
- You MUST generate exactly ${validCount} questions, no more, no less
- If the conversation doesn't have enough information, expand using well-known, factual, widely accepted information related to the topic
- Do NOT invent fake facts or hallucinate. Only use verifiable, commonly known information to expand
- Each question must have exactly 4 options labeled A, B, C, D
- Include the correct answer letter (A, B, C, or D)
- Include a SHORT explanation (1-2 sentences max) for why the answer is correct
- Return ONLY valid JSON array, no markdown, no extra text
- Subject context: ${subject || "general"}

OUTPUT FORMAT:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"Short explanation here."}]

Return ONLY the JSON array.`
      : `Generate multiple-choice questions based on the provided content.

ADAPTIVE MODE (Strict Count OFF):
- Target: ${validCount} questions, but only if the content supports it
- If the conversation is too short or limited, generate FEWER questions rather than making things up
- Do NOT hallucinate or invent information. Only create questions from what's actually in the content
- Each question must have exactly 4 options labeled A, B, C, D
- Include the correct answer letter (A, B, C, or D)
- Include a SHORT explanation (1-2 sentences max) for why the answer is correct
- Return ONLY valid JSON array, no markdown, no extra text
- Subject context: ${subject || "general"}

OUTPUT FORMAT:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"Short explanation here."}]

Return ONLY the JSON array.`;

    const response = await callGroqWithRotation(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationText },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Quiz generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content from model" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let quiz;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      quiz = JSON.parse(cleanContent);

      // Validate structure
      if (!Array.isArray(quiz)) {
        throw new Error("Response is not an array");
      }

      // Ensure each question has required fields
      quiz = quiz.map((q: any, i: number) => ({
        question: q.question || `Question ${i + 1}`,
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
        answer: q.answer || "A",
        explanation: q.explanation || "This is the correct answer based on the material.",
      }));

    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse quiz response" }),
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

    return new Response(
      JSON.stringify({ 
        quiz,
        quizzesUsed: quizzesUsedToday + 1,
        dailyLimit,
        isPremium
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
