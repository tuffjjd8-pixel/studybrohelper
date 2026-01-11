import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function callGroqAPI(apiKey: string, messages: any[], temperature: number, maxTokens: number) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  return response;
}

// Determine question count based on tier
function getQuestionCount(isPremium: boolean, isPatternMode: boolean): number {
  if (isPatternMode) {
    // Pattern mode: Pro gets more pattern questions
    return isPremium ? 8 : 5;
  }
  // Standard mode: Pro gets more questions
  return isPremium ? 10 : 5;
}

// Pattern-based quiz generation prompt (Pro Feature)
function getPatternPrompt(patternExample: string, count: number) {
  return {
    system: `You are a Pattern Quiz Generator. Analyze the given example and generate EXACTLY ${count} similar question(s).

RULES:
1. Detect the mathematical pattern from the example
2. Generate EXACTLY ${count} question(s) - no more, no less
3. Each question has 4 options (A, B, C, D) with ONE correct answer
4. Use simple numbers to avoid calculation errors
5. Generate as many high-quality questions as possible

OUTPUT FORMAT (JSON only, no markdown, no code blocks):
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctIndex":0,"explanation":"Pattern: formula. Calculation: steps = answer"}]}

EXPLANATION RULES:
- Show the formula and calculation steps
- Example: "Pattern: a*b + a^2. So: 6*5 + 36 = 66"
- NEVER say "This is the correct answer"
- Keep it short and clear`,
    user: `Example: ${patternExample}

Generate EXACTLY ${count} question(s) following this pattern. Output ONLY valid JSON.`
  };
}

// Standard quiz generation prompt
function getStandardPrompt(subject: string, question: string, solution: string, difficulty: string, count: number) {
  return {
    system: `You are a Quiz Generator. Generate EXACTLY ${count} high-quality question(s) about the given topic.

RULES:
1. Questions must be directly about the provided content
2. Each question has 4 options (A, B, C, D) with ONE correct answer
3. Difficulty: ${difficulty}
4. Generate EXACTLY ${count} question(s) - maximize quality
5. Cover different aspects of the topic

OUTPUT FORMAT (JSON only, no markdown, no code blocks):
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctIndex":0,"explanation":"Brief explanation of why this is correct"}]}

EXPLANATION RULES:
- Explain the logic or steps used
- NEVER say "This is the correct answer based on the topic"
- Keep it short and student-friendly`,
    user: `Subject: ${subject || "General"}
Problem: ${question || "Study material"}
Solution: ${solution}

Generate EXACTLY ${count} ${difficulty} question(s). Output ONLY valid JSON.`
  };
}

// Calculate appropriate max tokens based on question count
function getMaxTokens(count: number): number {
  // ~350 tokens per question, plus buffer for more detailed explanations
  return Math.min(Math.max(count * 400, 600), 4500);
}

// Sanitize JSON string before parsing
function sanitizeJsonString(str: string): string {
  // Remove any markdown code blocks
  str = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  // Remove any leading/trailing whitespace
  str = str.trim();
  // Try to extract just the JSON object
  const match = str.match(/\{[\s\S]*\}/);
  return match ? match[0] : str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      subject, 
      question, 
      solution, 
      difficulty = "medium", 
      mode = "standard", 
      patternExample,
      isPremium = false // User's premium status
    } = body;
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_BACKUP = Deno.env.get("GROQ_API_KEY_BACKUP");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const isPatternMode = mode === "pattern" && patternExample;
    
    // Auto-determine question count based on tier
    const questionCount = getQuestionCount(isPremium, isPatternMode);
    const maxTokens = getMaxTokens(questionCount);
    
    console.log("Generating quiz with Llama 3.1 8B:", { 
      mode: isPatternMode ? "pattern" : "standard",
      subject, 
      difficulty: isPatternMode ? "N/A" : difficulty, 
      count: questionCount,
      maxTokens,
      isPremium,
      patternExample: isPatternMode ? patternExample.substring(0, 50) : undefined
    });

    // Get appropriate prompts based on mode
    const prompts = isPatternMode 
      ? getPatternPrompt(patternExample, questionCount)
      : getStandardPrompt(subject, question, solution, difficulty, questionCount);

    const messages = [
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user }
    ];

    // Try primary API key first
    let response = await callGroqAPI(GROQ_API_KEY, messages, 0.2, maxTokens);

    // Fallback to backup key if primary fails
    if (!response.ok && GROQ_API_KEY_BACKUP) {
      console.log("Primary Groq API failed, trying backup...");
      response = await callGroqAPI(GROQ_API_KEY_BACKUP, messages, 0.2, maxTokens);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limited - please try again in a moment");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Raw Llama response:", content.substring(0, 500));

    // Sanitize and parse JSON
    const sanitizedJson = sanitizeJsonString(content);
    
    let quizData;
    try {
      quizData = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", sanitizedJson.substring(0, 200));
      throw new Error("Failed to parse quiz response");
    }

    // Validate the response
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz data structure");
    }

    // Validate each question structure
    const validQuestions = quizData.questions.filter((q: any) => 
      q.question && 
      Array.isArray(q.options) && 
      q.options.length === 4 &&
      typeof q.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3
    ).map((q: any) => ({
      ...q,
      explanation: q.explanation && !q.explanation.toLowerCase().includes("this is the correct answer") 
        ? q.explanation 
        : "Review the solution steps to understand this concept."
    }));

    if (validQuestions.length === 0) {
      throw new Error("No valid questions generated");
    }

    console.log(`Generated ${validQuestions.length} valid questions (requested ${questionCount})`);

    return new Response(
      JSON.stringify({ 
        questions: validQuestions,
        pattern_detected: quizData.pattern_detected,
        formula: quizData.formula
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quiz generation error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        questions: [{
          question: "Quiz generation failed. Did you understand the solution?",
          options: ["A) Yes, I understood it", "B) Mostly understood", "C) Need more practice", "D) Not really"],
          correctIndex: 0,
          explanation: "Please try generating the quiz again."
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
