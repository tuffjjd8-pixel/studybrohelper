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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating quiz:", { subject, difficulty, count });

    const difficultyInstructions: Record<string, string> = {
      easy: "Create SIMPLE questions that test basic recall and understanding. Focus on fundamental concepts.",
      medium: "Create BALANCED questions mixing recall and application. Include some problem-solving.",
      hard: "Create CHALLENGING questions with edge cases, multi-step reasoning, and deeper analysis."
    };

    const systemPrompt = `You are a quiz generator for students. Your task is to create EXACTLY ${count} multiple choice questions.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${count} questions - no more, no less
2. Each question must be DIRECTLY related to the topic/solution provided
3. Questions must test understanding of the specific content, NOT generic knowledge
4. Each question needs exactly 4 answer options (A, B, C, D)
5. Explanations should help the student understand WHY the answer is correct

Difficulty: ${difficulty.toUpperCase()}
${difficultyInstructions[difficulty] || difficultyInstructions.medium}

You MUST respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Clear question text related to the topic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

DO NOT include any text before or after the JSON. The questions array must have exactly ${count} items.`;

    const userMessage = `Create a quiz about this topic:

Subject: ${subject || "General"}

Original Problem: ${question || "Image-based problem"}

Solution/Content to test:
${solution}

Generate exactly ${count} ${difficulty} quiz questions that test understanding of THIS SPECIFIC solution and topic. Each question should relate directly to the concepts shown above.`;

    // Use Lovable AI Gateway
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.4, // Lower temperature for more consistent output
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limited - please try again in a moment");
      }
      if (response.status === 402) {
        throw new Error("API credits exhausted");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Raw AI response:", content.substring(0, 500));

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

    // Ensure we have the right number of questions
    if (quizData.questions.length < count) {
      console.warn(`Only got ${quizData.questions.length} questions, expected ${count}`);
    }

    // Validate each question structure
    const validQuestions = quizData.questions.filter((q: any) => 
      q.question && 
      Array.isArray(q.options) && 
      q.options.length === 4 &&
      typeof q.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3 &&
      q.explanation
    );

    if (validQuestions.length === 0) {
      throw new Error("No valid questions generated");
    }

    console.log(`Generated ${validQuestions.length} valid questions`);

    return new Response(
      JSON.stringify({ questions: validQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quiz generation error:", error);
    
    // Return a helpful error response with fallback question
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        questions: [{
          question: "Quiz generation failed. Did you understand the solution?",
          options: ["Yes, I understood it", "Mostly understood", "Need more practice", "Not really"],
          correctIndex: 0,
          explanation: "Please try generating the quiz again."
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
