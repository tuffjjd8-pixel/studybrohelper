import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Change this to any Gemini model (e.g., "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash")
// ============================================================
const GEMINI_MODEL = "gemini-2.0-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, question, solution, difficulty = "medium", count = 4 } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Generating quiz:", { subject, difficulty, count });

    const difficultyInstructions = {
      easy: "Make questions simple and straightforward. Focus on basic recall and understanding.",
      medium: "Balance between recall and application. Include some problem-solving.",
      hard: "Make questions challenging. Include edge cases, multi-step reasoning, and deeper analysis."
    };

    const systemPrompt = `You are a quiz generator. Create exactly ${count} multiple choice questions.

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

Test UNDERSTANDING, not memorization. Keep explanations brief.`;

    const userMessage = `Subject: ${subject || "general"}
Problem: ${question || "Image-based problem"}
Solution:
${solution}

Generate exactly ${count} ${difficulty} quiz questions.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
