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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, question, solution, difficulty = "medium", count = 5 } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_BACKUP = Deno.env.get("GROQ_API_KEY_BACKUP");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const questionCount = count || 5;
    console.log("Generating quiz with Llama 3.1 8B:", { subject, difficulty, count: questionCount });

    const systemPrompt = `You are the Quiz Generator for StudyBro.
Use these rules exactly:

1. Generate questions DIRECTLY related to the user's topic - no generic questions
2. Each question must have EXACTLY 4 answer choices labeled A, B, C, D
3. Only ONE answer is correct per question
4. Keep questions clear, unique, and grade-appropriate
5. Output ONLY valid JSON - no explanations, no extra text

You MUST generate EXACTLY ${questionCount} questions.

Output format (JSON only):
{
  "questions": [
    {
      "question": "Clear question about the specific topic?",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

CRITICAL: Generate exactly ${questionCount} questions. No more, no less.`;

    const userMessage = `Generate exactly ${questionCount} ${difficulty} quiz questions about this topic:

Subject: ${subject || "General"}
Problem: ${question || "Study material"}

Content to test:
${solution}

Remember: Questions must be DIRECTLY about this specific content. Output ONLY valid JSON.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
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
