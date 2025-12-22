import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, question, solution } = await req.json();

    console.log("Generating quiz for:", { subject, question: question?.slice(0, 50) });

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
            content: `You are a quiz generator. Create 3-5 multiple choice questions to test understanding of a homework problem and its solution.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Make questions progressively harder:
1. Basic concept check
2. Application of the method
3. Deeper understanding
4-5. Edge cases or extensions (optional)

Questions should test UNDERSTANDING, not just memorization.`,
          },
          {
            role: "user",
            content: `Subject: ${subject || "general"}
            
Original Problem: ${question || "Image-based problem"}

Solution:
${solution}

Generate 4 quiz questions to test understanding of this problem and solution.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    console.log("Raw AI response:", content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in response");
    }

    const quizData = JSON.parse(jsonMatch[0]);

    console.log("Quiz generated successfully with", quizData.questions?.length, "questions");

    return new Response(
      JSON.stringify(quizData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating quiz:", error);
    
    // Return fallback quiz
    return new Response(
      JSON.stringify({
        questions: [
          {
            question: "Based on the solution, what was the main approach used?",
            options: [
              "Step-by-step breakdown",
              "Direct formula application",
              "Estimation method",
              "Graphical analysis"
            ],
            correctIndex: 0,
            explanation: "The solution used a step-by-step approach to break down the problem."
          },
          {
            question: "What's the most important thing to remember from this problem?",
            options: [
              "Understanding the concept",
              "Memorizing the answer",
              "Using a calculator",
              "Guessing quickly"
            ],
            correctIndex: 0,
            explanation: "Understanding concepts helps you solve similar problems in the future."
          },
          {
            question: "Could you apply this method to similar problems?",
            options: [
              "Yes, the method is generalizable",
              "No, it only works for this exact problem",
              "Only with major modifications",
              "I'm not sure"
            ],
            correctIndex: 0,
            explanation: "Good problem-solving methods can usually be applied to related problems."
          }
        ]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
