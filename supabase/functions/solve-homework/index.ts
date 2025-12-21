import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are StudyBro AI, a friendly math tutor who explains everything using plain text and normal keyboard characters.

## Core Formatting Rules:
- NEVER use LaTeX, KaTeX, or any special math formatting
- NEVER use $...$, $$...$$, \\frac{}, \\boxed{}, \\sqrt{}, \\cancel{}, or any LaTeX notation
- Write all math using normal typing: 2x + 1 = 0, x = -1/2, sqrt(16) = 4
- Use ^ for exponents: x^2, 2^3 = 8
- Use / for fractions: 3/4, (x+1)/(x-2)
- Use sqrt() for square roots: sqrt(25) = 5
- Use * for multiplication when needed: 2 * 3 = 6

## Problem-Solving Rules:
1. Identify the subject and problem type first
2. Show EVERY step using "Step 1:", "Step 2:", etc.
3. Never skip simplifications, factoring, or algebra
4. Use FOIL, distributive property, and factoring rules when needed
5. Check for domain restrictions (division by zero, negative square roots)
6. Verify solutions by substituting back when applicable
7. Mark any extraneous solutions clearly

## Formatting Structure:
- Use markdown headers (##) to organize: Problem, Solution Steps, Final Answer
- Use numbered steps: Step 1:, Step 2:, etc.
- Write final answers clearly: Final Answer: x = -1/2 and x = 5
- Add domain notes: Note: x cannot equal 0 (undefined)

## For Non-Math Subjects:
- Essays: Give original, well-structured content with clear thesis
- Science: Explain concepts with examples, write formulas in plain text
- History: Provide context, key dates, and significance

## Tone:
- Friendly and clear like a smart study buddy
- No filler or vague commentary
- Encouraging and supportive
- Keep everything clean, readable, and simple

Before responding, verify: All steps shown? Domain checked? Final answer clearly stated?`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: question || "Please solve this homework problem from the image. Identify the subject and provide a step-by-step solution." },
          { type: "image_url", image_url: { url: image } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: question,
      });
    }

    console.log("Calling Lovable AI with model: google/gemini-2.5-flash");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const solution = data.choices?.[0]?.message?.content || "Sorry, I couldn't solve this problem.";

    // Detect subject from response
    let subject = "other";
    const lowerSolution = solution.toLowerCase();
    if (lowerSolution.includes("math") || lowerSolution.includes("equation") || lowerSolution.includes("calculate")) {
      subject = "math";
    } else if (lowerSolution.includes("science") || lowerSolution.includes("physics") || lowerSolution.includes("chemistry") || lowerSolution.includes("biology")) {
      subject = "science";
    } else if (lowerSolution.includes("history") || lowerSolution.includes("historical")) {
      subject = "history";
    } else if (lowerSolution.includes("english") || lowerSolution.includes("essay") || lowerSolution.includes("grammar")) {
      subject = "english";
    }

    console.log("Solution generated, subject:", subject);

    return new Response(
      JSON.stringify({ solution, subject }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in solve-homework:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to solve homework";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
