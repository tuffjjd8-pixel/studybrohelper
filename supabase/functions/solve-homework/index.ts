import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION - Groq Only
// Vision model for images: "llama-3.2-11b-vision-preview"
// Text model for text-only: "llama-3.1-8b-instant"
// ============================================================
const GROQ_VISION_MODEL = "llama-3.2-11b-vision-preview";
const GROQ_TEXT_MODEL = "llama-3.1-8b-instant";

// System prompt for free users
const FREE_SYSTEM_PROMPT = `You are StudyBro AI, a friendly math tutor who explains everything clearly with proper LaTeX math formatting.

## Core Formatting Rules:
- When solving math problems, format all expressions using LaTeX-style math notation
- Wrap inline equations in \`$...$\` for inline math
- Wrap display equations in \`$$...$$\` for display math
- Do NOT use plain text like x^2 or sqrt() - always use proper LaTeX

## LaTeX Examples:
- Fractions: $\\frac{3}{4}$
- Exponents: $x^2$
- Square roots: $\\sqrt{25} = 5$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Problem-Solving Rules:
1. Identify the subject and problem type first
2. Show key steps using "Step 1:", "Step 2:", etc.
3. Write final answers with emphasis: **Final Answer: $x = 5$**

## Tone:
- Friendly, supportive, and organized
- Keep explanations concise but clear`;

// Enhanced system prompt for premium users - more detailed and accurate
const PREMIUM_SYSTEM_PROMPT = `You are StudyBro AI Premium, an expert tutor providing the most detailed and accurate solutions with proper LaTeX math formatting.

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

2. **No Unjustified Simplification**
   - NEVER cancel terms unless mathematically valid and explicitly justified
   - Before canceling $(x - a)$ from both sides, state: "Since $x \\neq a$ (domain restriction), we can divide"

3. **Step-by-Step Transformations**
   - Show every algebraic step explicitly
   - When multiplying both sides by an expression, state the domain restriction

4. **Quadratic Solutions**
   - Show factored form of any quadratics: $x^2 - 4x - 5 = (x - 5)(x + 1)$
   - Apply quadratic formula when factoring is unclear

5. **Extraneous Solution Check (Mandatory)**
   - After solving, substitute EACH solution back into the ORIGINAL equation
   - Check against domain restrictions
   - Mark extraneous solutions clearly

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

// Call Groq API for text-only input
async function callGroqText(question: string, isPremium: boolean): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const systemPrompt = isPremium ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  console.log("Calling Groq Text API with model:", GROQ_TEXT_MODEL, "Premium:", isPremium);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: isPremium ? 0.5 : 0.7,
      max_tokens: isPremium ? 8192 : 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq Text API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't solve this problem.";
}

// Call Groq API for image input (Vision model)
async function callGroqVision(question: string, imageBase64: string, mimeType: string, isPremium: boolean): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const systemPrompt = isPremium ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  const textContent = question || "Please solve this homework problem from the image. Identify the subject and provide a step-by-step solution.";
  
  console.log("Calling Groq Vision API with model:", GROQ_VISION_MODEL, "Premium:", isPremium);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: textContent },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: isPremium ? 0.5 : 0.7,
      max_tokens: isPremium ? 8192 : 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq Vision API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't solve this problem.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, image, isPremium } = await req.json();
    
    let solution: string;

    // Route to appropriate Groq model based on input type
    if (image) {
      // Image input → use Groq Vision
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid image format");
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      solution = await callGroqVision(question || "", base64Data, mimeType, isPremium || false);
    } else if (question) {
      // Text-only input → use Groq Text
      solution = await callGroqText(question, isPremium || false);
    } else {
      throw new Error("Please provide a question or image");
    }

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
    
    // Handle rate limits
    if (errorMessage.includes("Rate limit")) {
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
