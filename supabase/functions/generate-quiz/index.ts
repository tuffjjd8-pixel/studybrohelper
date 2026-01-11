import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function callGroqAPI(apiKey: string, messages: any[], temperature: number) {
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
      max_tokens: 4000,
    }),
  });
  return response;
}

// Pattern-based quiz generation prompt
function getPatternPrompt(patternExample: string, count: number) {
  return {
    system: `You are the Pattern Quiz Generator for StudyBro.

When given a single example like "2 + 3 = 10", you must:
1. Analyze the mathematical pattern or transformation
2. Identify the formula (e.g., a·b + a² = result, or (a+b)·a = result)
3. Generate ${count} NEW questions following the SAME pattern with different numbers
4. Each question has EXACTLY 4 options (A, B, C, D) with ONE correct answer

EXPLANATION RULES (CRITICAL):
- NEVER say "This is the correct answer based on the topic"
- Clearly explain the specific pattern/formula used
- Show the calculation steps briefly
- Use student-friendly language
- Example: "The pattern is a·b + a². So: 6·5 + 6² = 30 + 36 = 66"

Output ONLY valid JSON:
{
  "pattern_detected": "Brief description of the pattern found",
  "formula": "The mathematical formula (e.g., a·b + a²)",
  "questions": [
    {
      "question": "What is the result of applying the pattern to X + Y?",
      "options": ["A) 10", "B) 20", "C) 30", "D) 40"],
      "correctIndex": 0,
      "explanation": "Using the pattern a·b + a²: X·Y + X² = [calculation] = [answer]"
    }
  ]
}

CRITICAL: Generate EXACTLY ${count} questions. Vary the numbers to test understanding.`,
    user: `Analyze this example and generate ${count} similar quiz questions:

Example: ${patternExample}

Steps:
1. Find the pattern/formula that transforms the input to the output
2. Generate ${count} new questions using different numbers but the SAME pattern
3. Calculate the correct answer for each
4. Create 3 plausible wrong options for each question
5. Write clear explanations showing the calculation

Output ONLY valid JSON.`
  };
}

// Standard difficulty-based quiz generation prompt
function getStandardPrompt(subject: string, question: string, solution: string, difficulty: string, count: number) {
  return {
    system: `You are the Quiz Generator for StudyBro.
Use these rules exactly:

1. Generate questions DIRECTLY related to the user's topic - no generic questions
2. Each question must have EXACTLY 4 answer choices labeled A, B, C, D
3. Only ONE answer is correct per question
4. Keep questions clear, unique, and grade-appropriate
5. Output ONLY valid JSON - no explanations, no extra text

EXPLANATION RULES (CRITICAL):
- NEVER say "This is the correct answer based on the topic"
- Explain the logic or steps used to find the answer
- Reference the formula or method applied
- Use concise, student-friendly language
- Show brief calculation if applicable

You MUST generate EXACTLY ${count} questions.

Output format (JSON only):
{
  "questions": [
    {
      "question": "Clear question about the specific topic?",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctIndex": 0,
      "explanation": "Clear step-by-step explanation of why this answer is correct"
    }
  ]
}

CRITICAL: Generate exactly ${count} questions. No more, no less.`,
    user: `Generate exactly ${count} ${difficulty} quiz questions about this topic:

Subject: ${subject || "General"}
Problem: ${question || "Study material"}

Content to test:
${solution}

Remember: Questions must be DIRECTLY about this specific content. Output ONLY valid JSON.`
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, question, solution, difficulty = "medium", count = 5, mode = "standard", patternExample } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_BACKUP = Deno.env.get("GROQ_API_KEY_BACKUP");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const questionCount = count || 5;
    const isPatternMode = mode === "pattern" && patternExample;
    
    console.log("Generating quiz with Llama 3.1 8B:", { 
      mode: isPatternMode ? "pattern" : "standard",
      subject, 
      difficulty: isPatternMode ? "N/A" : difficulty, 
      count: questionCount,
      patternExample: isPatternMode ? patternExample : undefined
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
    let response = await callGroqAPI(GROQ_API_KEY, messages, 0.3);

    // Fallback to backup key if primary fails
    if (!response.ok && GROQ_API_KEY_BACKUP) {
      console.log("Primary Groq API failed, trying backup...");
      response = await callGroqAPI(GROQ_API_KEY_BACKUP, messages, 0.3);
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No valid JSON found in response");
      throw new Error("Invalid response format");
    }

    const quizData = JSON.parse(jsonMatch[0]);

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
      explanation: q.explanation || "This is the correct answer based on the topic."
    }));

    if (validQuestions.length === 0) {
      throw new Error("No valid questions generated");
    }

    console.log(`Generated ${validQuestions.length} valid questions (requested ${questionCount})`);

    return new Response(
      JSON.stringify({ questions: validQuestions }),
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
