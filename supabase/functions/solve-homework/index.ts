import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION - Groq Only
// Vision model for images: "meta-llama/llama-4-scout-17b-16e-instruct"
// Text model for text-only: "llama-3.1-8b-instant"
// ============================================================
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TEXT_MODEL = "llama-3.1-8b-instant";

// ============================================================
// TIER LIMITS
// ============================================================
const FREE_ANIMATED_STEPS = 5;
const PREMIUM_ANIMATED_STEPS = 16;
const FREE_GRAPHS_PER_DAY = 4;
const PREMIUM_GRAPHS_PER_DAY = 15;

// System prompt for free users - basic explanations
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

## CRITICAL: Fraction Conversion Rule
- When subtracting fractions from whole numbers, ALWAYS convert the whole number to a fraction first
- Example: $10 - \\frac{1}{2}$ → First write $10 = \\frac{20}{2}$, then $\\frac{20}{2} - \\frac{1}{2} = \\frac{19}{2}$
- NEVER skip the conversion step. Show it explicitly every time.

## Pattern-Based Equations (Non-Standard Arithmetic)
For equations like "a + b = result" where the result is NOT standard addition:
1. First try to find a SINGLE simple pattern that fits ALL given examples
2. Prefer compact patterns: $(a + b) \\times a$, $(a + b) \\times b$, $a \\times b \\times (a + b)$, etc.
3. STOP as soon as you find a pattern that fits every equation
4. Explain the pattern in 1-3 short sentences
5. Show a quick check for each equation (max 1 line per equation)
6. Do NOT include long step-by-step failed attempts or numbered sections repeating "doesn't fit"
7. If no single pattern fits all equations, say clearly: "No single consistent pattern fits all of these equations."

Example: For 2+3=10, 8+4=96, 7+2=63, 6+5=66 → Pattern is $(a + b) \\times a$
- $2+3=10$: $(2+3) \\times 2 = 5 \\times 2 = 10$ ✓
- $8+4=96$: $(8+4) \\times 8 = 12 \\times 8 = 96$ ✓
- $7+2=63$: $(7+2) \\times 7 = 9 \\times 7 = 63$ ✓
- $6+5=66$: $(6+5) \\times 6 = 11 \\times 6 = 66$ ✓

## Problem-Solving Rules:
1. Identify the subject and problem type first
2. Show key steps using "Step 1:", "Step 2:", etc.
3. Write final answers with emphasis: **Final Answer: $x = 5$**

## Tone:
- Friendly, supportive, and organized
- Keep explanations concise but clear`;

// Enhanced system prompt for premium users - detailed, accurate, priority reasoning
const PREMIUM_SYSTEM_PROMPT = `You are StudyBro AI Premium, an expert tutor providing the most detailed and accurate solutions with proper LaTeX math formatting. You have access to Groq's latest models for enhanced OCR, formatting, and reasoning.

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

## CRITICAL: Fraction Conversion Rule (MANDATORY)
- When subtracting fractions from whole numbers, ALWAYS convert the whole number to a fraction first
- Example: $10 - \\frac{1}{2}$ → First write $10 = \\frac{20}{2}$, then $\\frac{20}{2} - \\frac{1}{2} = \\frac{19}{2}$
- NEVER skip the conversion step. Show it explicitly every time.
- This applies to ALL operations involving whole numbers and fractions.

## Pattern-Based Equations (Non-Standard Arithmetic)
For equations like "a + b = result" where the result is NOT standard addition:
1. First try to find a SINGLE simple pattern that fits ALL given examples
2. Prefer compact patterns: $(a + b) \\times a$, $(a + b) \\times b$, $a \\times b \\times (a + b)$, etc.
3. STOP as soon as you find a pattern that fits every equation
4. Explain the pattern in 1-3 short sentences
5. Show a quick check for each equation (max 1 line per equation)
6. Do NOT include long step-by-step failed attempts or numbered sections repeating "doesn't fit"
7. If no single pattern fits all equations, say clearly: "No single consistent pattern fits all of these equations."

Example: For 2+3=10, 8+4=96, 7+2=63, 6+5=66 → Pattern is $(a + b) \\times a$
- $2+3=10$: $(2+3) \\times 2 = 5 \\times 2 = 10$ ✓
- $8+4=96$: $(8+4) \\times 8 = 12 \\times 8 = 96$ ✓
- $7+2=63$: $(7+2) \\times 7 = 9 \\times 7 = 63$ ✓
- $6+5=66$: $(6+5) \\times 6 = 11 \\times 6 = 66$ ✓

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

// Prompt to generate structured animated steps
function getAnimatedStepsPrompt(maxSteps: number): string {
  return `

IMPORTANT: Structure your response as exactly ${maxSteps} numbered steps maximum.
Each step should be self-contained and build on the previous.
Format each step as:
**Step N: [Title]**
[Content with LaTeX formatting]

Keep each step focused on ONE key action or concept.`;
}

// Prompt to generate graph data - structured JSON for frontend rendering
// CRITICAL: Never output images, URLs, base64, ASCII art, or symbolic drawings
const GRAPH_PROMPT = `

## GRAPH GENERATION RULES (CRITICAL):
When generateGraph is true, output a structured JSON object describing the graph.

### NEVER DO:
- NEVER generate images, URLs, base64, ASCII art, or symbolic drawings
- NEVER say "here is a graph" and describe it visually
- NEVER output anything except structured JSON data and a short explanation

### WHEN to Generate a Graph:
Only generate graph data when the problem contains:
- An equation (y = 2x + 3, f(x) = x², etc.)
- A function to plot
- Data that can be charted (Jan 100, Feb 150, etc.)
- Systems of equations
- Trends or statistics

If the problem is simple arithmetic, definitions, word problems without functions, or conceptual questions, DO NOT generate a graph. Return NO graph block.

### Graph JSON Format:
At the END of your response, include ONLY this JSON block:

\`\`\`graph
{
  "type": "line",
  "labels": [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "datasets": [
    {
      "label": "y = 2x + 3",
      "data": [-17, -15, -13, -11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]
    }
  ]
}
\`\`\`

### Rules for Generating Graph Data:
1. **For equations** (like y = 2x + 3):
   - Generate x values from -10 to 10 (21 values) unless user specifies a range
   - Calculate corresponding y values by substituting each x
   - type: "line" for linear, "scatter" for quadratics/complex

2. **For data** (like "Jan: 100, Feb: 150, Mar: 200"):
   - labels: the category names ["Jan", "Feb", "Mar"]
   - data: the values [100, 150, 200]
   - type: "bar" for comparisons, "line" for trends

3. **Supported types**: "line" | "bar" | "scatter"

4. **Keep explanations SHORT** (3-5 steps max):
   - Step 1: Identify the equation/function
   - Step 2: Note key points (intercepts, slope, vertex)
   - Step 3: Describe what the graph shows

### Example for y = x:
\`\`\`graph
{
  "type": "line",
  "labels": [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "datasets": [
    {
      "label": "y = x",
      "data": [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
  ]
}
\`\`\`

### Example for y = x² (quadratic):
\`\`\`graph
{
  "type": "scatter",
  "labels": [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
  "datasets": [
    {
      "label": "y = x²",
      "data": [25, 16, 9, 4, 1, 0, 1, 4, 9, 16, 25]
    }
  ]
}
\`\`\`

Do NOT include any text outside the explanation and JSON block.`;

// Call Groq API for text-only input
async function callGroqText(
  question: string, 
  isPremium: boolean,
  animatedSteps: boolean,
  generateGraph: boolean
): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  let systemPrompt = isPremium ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  // Add animated steps instruction
  if (animatedSteps) {
    const maxSteps = isPremium ? PREMIUM_ANIMATED_STEPS : FREE_ANIMATED_STEPS;
    systemPrompt += getAnimatedStepsPrompt(maxSteps);
  }
  
  // Add graph generation instruction
  if (generateGraph) {
    systemPrompt += GRAPH_PROMPT;
  }
  
  console.log("Calling Groq Text API with model:", GROQ_TEXT_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps, "GenerateGraph:", generateGraph);

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

// Call Groq API for image input (Vision model) - Enhanced OCR for premium
async function callGroqVision(
  question: string, 
  imageBase64: string, 
  mimeType: string, 
  isPremium: boolean,
  animatedSteps: boolean,
  generateGraph: boolean
): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  let systemPrompt = isPremium ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  // Premium gets enhanced OCR instructions
  if (isPremium) {
    systemPrompt += `

## Enhanced Image Processing (Premium):
- Extract ALL text from the image with high accuracy
- Preserve mathematical notation and formatting exactly as shown
- Identify handwritten vs printed text and handle appropriately
- If the image quality is poor, state what you can read and any uncertainties`;
  }
  
  // Add animated steps instruction
  if (animatedSteps) {
    const maxSteps = isPremium ? PREMIUM_ANIMATED_STEPS : FREE_ANIMATED_STEPS;
    systemPrompt += getAnimatedStepsPrompt(maxSteps);
  }
  
  // Add graph generation instruction
  if (generateGraph) {
    systemPrompt += GRAPH_PROMPT;
  }

  const textContent = question || "Please solve this homework problem from the image. Identify the subject and provide a step-by-step solution.";
  
  console.log("Calling Groq Vision API with model:", GROQ_VISION_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps, "GenerateGraph:", generateGraph);

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

// Parse structured steps from solution
function parseAnimatedSteps(solution: string, maxSteps: number): Array<{ title: string; content: string }> {
  const steps: Array<{ title: string; content: string }> = [];
  
  // Match patterns like "**Step 1: Title**" or "Step 1:" or "## Step 1"
  const stepPattern = /(?:\*\*)?(?:##?\s*)?Step\s*(\d+):?\s*([^\*\n]*)?(?:\*\*)?\n?([\s\S]*?)(?=(?:\*\*)?(?:##?\s*)?Step\s*\d+|$)/gi;
  
  let match;
  while ((match = stepPattern.exec(solution)) !== null && steps.length < maxSteps) {
    const stepNum = parseInt(match[1]);
    const title = match[2]?.trim() || `Step ${stepNum}`;
    const content = match[3]?.trim() || "";
    
    if (content) {
      steps.push({ title, content });
    }
  }
  
  // If no structured steps found, create a single step with the full content
  if (steps.length === 0 && solution.trim()) {
    steps.push({ title: "Solution", content: solution.trim() });
  }
  
  return steps.slice(0, maxSteps);
}

// Parse graph data from solution
function parseGraphData(solution: string): { type: string; data: Record<string, unknown> } | null {
  const graphMatch = solution.match(/```graph\n?([\s\S]*?)\n?```/);
  
  if (!graphMatch) return null;
  
  try {
    const graphJson = JSON.parse(graphMatch[1]);
    return {
      type: graphJson.type || "line",
      data: graphJson
    };
  } catch (e) {
    console.error("Failed to parse graph data:", e);
    return null;
  }
}

// Remove graph block from solution text
function cleanSolutionText(solution: string): string {
  return solution.replace(/```graph\n?[\s\S]*?\n?```/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      question, 
      image, 
      isPremium = false,
      animatedSteps = false,
      generateGraph = false,
      userGraphCount = 0 // Current graph count for the day
    } = await req.json();
    
    // Check graph limit
    const maxGraphs = isPremium ? PREMIUM_GRAPHS_PER_DAY : FREE_GRAPHS_PER_DAY;
    const canGenerateGraph = generateGraph && userGraphCount < maxGraphs;
    
    if (generateGraph && !canGenerateGraph) {
      console.log(`Graph limit reached: ${userGraphCount}/${maxGraphs} (Premium: ${isPremium})`);
    }
    
    let solution: string;

    // Route to appropriate Groq model based on input type
    if (image) {
      // Image input → use Groq Vision (Enhanced OCR for premium)
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid image format");
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      solution = await callGroqVision(
        question || "", 
        base64Data, 
        mimeType, 
        isPremium, 
        animatedSteps,
        canGenerateGraph
      );
    } else if (question) {
      // Text-only input → use Groq Text
      solution = await callGroqText(question, isPremium, animatedSteps, canGenerateGraph);
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

    // Build response object
    const responseData: Record<string, unknown> = {
      solution: cleanSolutionText(solution),
      subject,
      tier: isPremium ? "premium" : "free"
    };
    
    // Add animated steps if requested
    if (animatedSteps) {
      const maxSteps = isPremium ? PREMIUM_ANIMATED_STEPS : FREE_ANIMATED_STEPS;
      responseData.steps = parseAnimatedSteps(solution, maxSteps);
      responseData.maxSteps = maxSteps;
    }
    
    // Add graph data if generated
    if (canGenerateGraph) {
      const graphData = parseGraphData(solution);
      if (graphData) {
        responseData.graph = graphData;
        responseData.graphsRemaining = maxGraphs - userGraphCount - 1;
      }
    }
    
    // Add tier info for frontend
    responseData.limits = {
      animatedSteps: isPremium ? PREMIUM_ANIMATED_STEPS : FREE_ANIMATED_STEPS,
      graphsPerDay: maxGraphs,
      graphsUsed: canGenerateGraph && responseData.graph ? userGraphCount + 1 : userGraphCount,
      hasEnhancedOCR: isPremium,
      hasPriorityResponse: isPremium,
      hasModelSelection: isPremium
    };

    console.log("Solution generated, subject:", subject, "steps:", responseData.steps ? (responseData.steps as Array<unknown>).length : 0, "hasGraph:", !!responseData.graph);

    return new Response(
      JSON.stringify(responseData),
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
