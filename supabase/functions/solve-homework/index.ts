import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are StudyBro AI, a friendly math tutor who explains everything clearly with proper LaTeX math formatting.

## Core Formatting Rules:
- When solving math problems, format all expressions using LaTeX-style math notation
- Wrap inline equations in \`$...$\` for inline math
- Wrap display equations in \`$$...$$\` for display math
- Do NOT use plain text like x^2 or sqrt() - always use proper LaTeX
- Always format math cleanly and clearly for readability

## LaTeX Examples:
- Fractions: $\\frac{3}{4}$, $\\frac{x + 1}{x - 2}$
- Exponents: $x^2$, $2^3 = 8$
- Square roots: $\\sqrt{25} = 5$, $\\sqrt{x + 1}$
- Multiplication: $x \\cdot 2x$, $2 \\times 3 = 6$
- Not equal: $x \\neq -1$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## ERROR-FREE ALGEBRAIC SOLUTIONS (Critical Rules):
For equations, especially rational/algebraic equations, follow these strict rules:

1. **Domain Restrictions First**
   - Identify ALL values that make any denominator zero BEFORE solving
   - State clearly: "Domain restriction: $x \\neq [value]$ because [denominator] = 0"
   - Track these throughout the solution

2. **No Unjustified Simplification**
   - NEVER cancel terms unless mathematically valid and explicitly justified
   - Before canceling $(x - a)$ from both sides, state: "Since $x \\neq a$ (domain restriction), we can divide both sides by $(x - a)$"

3. **Step-by-Step Transformations**
   - Show every algebraic step explicitly
   - When multiplying both sides by an expression, state the domain restriction that allows it
   - Label each step: "Multiplying both sides by $(2x - 4)$, valid since $x \\neq 2$"

4. **Quadratic Solutions**
   - Show factored form of any quadratics: $x^2 - 4x - 5 = (x - 5)(x + 1)$
   - Apply quadratic formula when factoring is unclear
   - List all potential solutions before checking

5. **Extraneous Solution Check (Mandatory)**
   - After solving, substitute EACH solution back into the ORIGINAL equation
   - Check against domain restrictions
   - Mark extraneous solutions: "$x = 2$ is EXTRANEOUS (makes denominator zero)"
   - Only include valid solutions in final answer

6. **Final Answer Format**
   - Domain restrictions: $x \\neq [values]$
   - Valid solutions: $x = [values]$
   - Extraneous solutions (if any): $x = [values]$ rejected because [reason]

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
- Write final answers with emphasis: **Final Answer: $x = -\\frac{1}{2}$ and $x = 5$**
- Add domain notes: Note: $x \\neq 0$ (undefined)

## For Non-Math Subjects:
- Essays: Give original, well-structured content with clear thesis
- Science: Explain concepts with examples, use LaTeX for formulas
- History: Provide context, key dates, and significance

## Tone:
- Friendly, supportive, and organized
- Human-like explanations that are easy to follow
- Keep everything clean, readable, and beautifully formatted

Before responding, verify: All steps shown? LaTeX formatted correctly? Domain checked? Extraneous solutions checked? Final answer emphasized?`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, image } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
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

    console.log("Calling OpenRouter API");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://studybro.app",
        "X-Title": "StudyBro AI",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenRouter API error: ${response.status}`);
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
