import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, question, solution, difficulty = "medium", count = 4 } = await req.json();

    console.log("Generating quiz:", { subject, difficulty, count });

    const difficultyInstructions = {
      easy: "Make questions simple and straightforward. Focus on basic recall and understanding.",
      medium: "Balance between recall and application. Include some problem-solving.",
      hard: "Make questions challenging. Include edge cases, multi-step reasoning, and deeper analysis."
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a quiz generator. Create exactly ${count} multiple choice questions.

Difficulty: ${difficulty.toUpperCase()}
${difficultyInstructions[difficulty as keyof typeof difficultyInstructions] || difficultyInstructions.medium}

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Test UNDERSTANDING, not memorization. Keep explanations brief.`,
          },
          {
            role: "user",
            content: `Subject: ${subject || "general"}
Problem: ${question || "Image-based problem"}
Solution:
${solution}

Generate exactly ${count} ${difficulty} quiz questions.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON");

    const quizData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quiz error:", error);
    return new Response(
      JSON.stringify({
        questions: [{
          question: "Did you understand the solution?",
          options: ["Yes!", "Mostly", "Need practice", "Not really"],
          correctIndex: 0,
          explanation: "Understanding is key to learning."
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
