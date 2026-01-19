import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Vision model for images: "meta-llama/llama-4-scout-17b-16e-instruct" (Groq)
// Text model for text-only: "llama-3.3-70b-versatile" (Groq) - Heavy reasoning
// Graph model: LLaMA 3.3 70B via OpenRouter (free tier, structured JSON)
// Uses 7-key fallback rotation for high availability
// ============================================================
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_GRAPH_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// All available Groq API keys in priority order
const API_KEY_NAMES = [
  "GROQ_API_KEY",
  "GROQ_API_KEY_1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_BACKUP",
];

// Get all available API keys
function getAvailableApiKeys(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];
  
  for (const keyName of API_KEY_NAMES) {
    const key = Deno.env.get(keyName);
    if (key) {
      keys.push({ name: keyName, key });
    }
  }
  
  if (keys.length === 0) {
    throw new Error("No GROQ API key configured");
  }
  
  return keys;
}

// ============================================================
// TIER LIMITS
// ============================================================
const FREE_ANIMATED_STEPS = 5;
const PREMIUM_ANIMATED_STEPS = 16;
const FREE_GRAPHS_PER_DAY = 4;
const PREMIUM_GRAPHS_PER_DAY = 15;

// System prompt for free users - supports ALL subjects
const FREE_SYSTEM_PROMPT = `You are StudyBro AI, a friendly tutor who helps students with ALL subjects — math, science, history, literature, coding, languages, and more.

## Subject Detection:
- First, identify what subject the question is about
- Respond using the appropriate format and conventions for that subject
- Do NOT assume every question is math-related

## Core Formatting Rules:
- For math problems, use LaTeX notation: \`$...$\` for inline, \`$$...$$\` for display
- For science, include formulas in LaTeX where applicable
- For coding questions, use markdown code blocks with syntax highlighting
- For essays/writing, structure with clear paragraphs and thesis
- For history, include key dates, context, and significance
- For right angles in geometry, use the proper symbol ∟ or ⊾ instead of the letter "C"

## LaTeX Examples (for math/science):
- Fractions: $\\frac{3}{4}$
- Exponents: $x^2$
- Square roots: $\\sqrt{25} = 5$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## CRITICAL: Fraction Conversion Rule (Math)
- When subtracting fractions from whole numbers, ALWAYS convert the whole number to a fraction first
- Example: $10 - \\frac{1}{2}$ → First write $10 = \\frac{20}{2}$, then $\\frac{20}{2} - \\frac{1}{2} = \\frac{19}{2}$

## Pattern-Based Equations (Non-Standard Arithmetic)
For equations like "a + b = result" where the result is NOT standard addition:
1. Find a SINGLE simple pattern that fits ALL given examples
2. Explain the pattern in 1-3 short sentences
3. Show a quick check for each equation

## Problem-Solving Rules:
1. Identify the subject and problem type first
2. Show key steps using "Step 1:", "Step 2:", etc.
3. Write final answers with emphasis: **Final Answer: ...**

## Tone:
- Friendly, supportive, and organized
- Keep explanations concise but clear`;

// Enhanced system prompt for premium users - supports ALL subjects with priority reasoning
const PREMIUM_SYSTEM_PROMPT = `You are StudyBro AI Premium, an expert tutor for ALL subjects — math, science, history, literature, coding, languages, and more. You provide the most detailed and accurate solutions with enhanced reasoning.

## Subject Detection:
- First, identify what subject the question is about
- Respond using the appropriate format and conventions for that subject
- Do NOT assume every question is math-related

## Core Formatting Rules:
- For math problems, use LaTeX notation: \`$...$\` for inline, \`$$...$$\` for display
- For science, include formulas in LaTeX where applicable
- For coding questions, use markdown code blocks with syntax highlighting
- For essays/writing, structure with clear paragraphs and thesis
- For history, include key dates, context, and significance
- For right angles in geometry, use the proper symbol ∟ or ⊾ instead of the letter "C"

## LaTeX Examples (for math/science):
- Fractions: $\\frac{3}{4}$, $\\frac{x + 1}{x - 2}$
- Exponents: $x^2$, $2^3 = 8$
- Square roots: $\\sqrt{25} = 5$, $\\sqrt{x + 1}$
- Multiplication: $x \\cdot 2x$, $2 \\times 3 = 6$
- Not equal: $x \\neq -1$
- Display equations: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## CRITICAL: Fraction Conversion Rule (Math)
- When subtracting fractions from whole numbers, ALWAYS convert the whole number to a fraction first
- Example: $10 - \\frac{1}{2}$ → First write $10 = \\frac{20}{2}$, then $\\frac{20}{2} - \\frac{1}{2} = \\frac{19}{2}$
- NEVER skip the conversion step. Show it explicitly every time.

## Pattern-Based Equations (Non-Standard Arithmetic)
For equations like "a + b = result" where the result is NOT standard addition:
1. Find a SINGLE simple pattern that fits ALL given examples
2. Explain the pattern in 1-3 short sentences
3. Show a quick check for each equation

## ERROR-FREE ALGEBRAIC SOLUTIONS (Math):
1. **Domain Restrictions First** - Identify values that make denominators zero
2. **Step-by-Step Transformations** - Show every algebraic step
3. **Extraneous Solution Check** - Substitute solutions back into original equation
4. **Final Answer Format** - Domain restrictions, valid solutions, extraneous if any

## Subject-Specific Guidelines:

### Science (Physics, Chemistry, Biology):
- Include relevant formulas with units
- Explain concepts with real-world examples
- Show calculations step by step

### History:
- Provide historical context
- Include key dates and figures
- Explain significance and impact

### Literature/Writing:
- Give original, well-structured content
- Include clear thesis statements
- Analyze themes, characters, and literary devices

### Coding:
- Use proper syntax highlighting
- Explain the logic behind the code
- Include comments for clarity

## Problem-Solving Rules:
1. Identify the subject and problem type first
2. Show EVERY step using "Step 1:", "Step 2:", etc.
3. Write final answers with emphasis: **Final Answer: ...**
4. Verify solutions when applicable

## Tone:
- Friendly, supportive, and organized
- Human-like explanations that are easy to follow
- Keep everything clean, readable, and beautifully formatted`;

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

// Prompt to generate graph data - optimized for Mistral Small 3.1 24B
const GRAPH_PROMPT = `You are generating structured graph data. 
Do NOT generate Python code, images, ASCII art, or explanations.

Return ONLY a JSON object in this format:

{
  "graph": {
    "type": "line" | "bar" | "scatter",
    "labels": [...],
    "datasets": [
      {
        "label": "string",
        "data": [...]
      }
    ]
  }
}

Rules:
- If the user provides an equation (e.g., y = 2x + 3), generate x values from -10 to 10 and compute y.
- If the user provides data (e.g., Jan 100, Feb 150), convert it into labels and datasets.
- Do not include any text before or after the JSON.
- Do not output code.
- Do not describe the graph.
- Only output the JSON object.`;

// Check if problem should trigger graph generation
function shouldGenerateGraph(question: string): boolean {
  const lowerQ = question.toLowerCase();
  return (
    lowerQ.includes("graph") ||
    lowerQ.includes("plot") ||
    lowerQ.includes("y =") ||
    lowerQ.includes("y=") ||
    lowerQ.includes("f(x)") ||
    lowerQ.includes("chart") ||
    lowerQ.includes("visualize") ||
    /\by\s*=\s*[\dx\+\-\*\/\^\(\)]+/i.test(question)
  );
}

// Call OpenRouter API for graph generation (Mistral Small 3.1 24B)
async function callOpenRouterGraph(question: string): Promise<string> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  console.log("Calling OpenRouter API with model:", OPENROUTER_GRAPH_MODEL, "for graph generation");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_GRAPH_MODEL,
      messages: [
        { role: "system", content: GRAPH_PROMPT },
        { role: "user", content: question }
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

// Call Groq API for text-only input with fallback rotation
async function callGroqText(
  question: string, 
  isPremium: boolean,
  animatedSteps: boolean
): Promise<string> {
  const apiKeys = getAvailableApiKeys();

  let systemPrompt = isPremium ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  // Add animated steps instruction
  if (animatedSteps) {
    const maxSteps = isPremium ? PREMIUM_ANIMATED_STEPS : FREE_ANIMATED_STEPS;
    systemPrompt += getAnimatedStepsPrompt(maxSteps);
  }
  
  console.log("Calling Groq Text API with model:", GROQ_TEXT_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

  let lastError: Error | null = null;
  
  for (const { name, key } of apiKeys) {
    try {
      console.log(`Trying ${name} for text completion...`);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
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
        console.error(`${name} failed:`, response.status, errorText);
        
        if (response.status === 429) {
          lastError = new Error(`Rate limit exceeded on ${name}`);
          continue;
        }
        
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response content");
      }
      
      console.log(`Text completion successful using ${name}`);
      return content;
      
    } catch (error) {
      console.error(`${name} error:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  throw lastError || new Error("All API keys failed");
}

// Call Groq API for image input (Vision model) with fallback rotation
async function callGroqVision(
  question: string, 
  imageBase64: string, 
  mimeType: string, 
  isPremium: boolean,
  animatedSteps: boolean
): Promise<string> {
  const apiKeys = getAvailableApiKeys();

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

  const textContent = question || "Please solve this homework problem from the image. Identify the subject and provide a step-by-step solution.";
  
  console.log("Calling Groq Vision API with model:", GROQ_VISION_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

  let lastError: Error | null = null;
  
  for (const { name, key } of apiKeys) {
    try {
      console.log(`Trying ${name} for vision completion...`);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
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
        console.error(`${name} failed:`, response.status, errorText);
        
        if (response.status === 429) {
          lastError = new Error(`Rate limit exceeded on ${name}`);
          continue;
        }
        
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("No response content");
      }
      
      console.log(`Vision completion successful using ${name}`);
      return content;
      
    } catch (error) {
      console.error(`${name} error:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  throw lastError || new Error("All API keys failed");
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

// Parse graph data from raw JSON response (OpenRouter returns raw JSON)
function parseGraphData(response: string): { type: string; data: Record<string, unknown> } | null {
  if (!response || response.trim() === "") return null;
  
  try {
    // Try to parse the raw JSON directly
    let jsonStr = response.trim();
    
    // Remove any markdown code fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```(?:json|graph)?\n?/g, "").replace(/\n?```$/g, "").trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Handle both { graph: {...} } and direct graph object formats
    const graphData = parsed.graph || parsed;
    
    if (graphData.type && graphData.labels && graphData.datasets) {
      // Return the full graph object as data so GraphRenderer can access labels/datasets
      return {
        type: graphData.type || "line",
        data: {
          type: graphData.type || "line",
          labels: graphData.labels,
          datasets: graphData.datasets,
          title: graphData.title,
          xLabel: graphData.xLabel,
          yLabel: graphData.yLabel,
          equation: graphData.equation,
          domain: graphData.domain,
          range: graphData.range,
        }
      };
    }
    
    return null;
  } catch (e) {
    console.error("Failed to parse graph data:", e, "Response:", response.substring(0, 200));
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

    // Route to appropriate model based on input type
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
        animatedSteps
      );
    } else if (question) {
      // Text-only input → use Groq Text
      solution = await callGroqText(question, isPremium, animatedSteps);
    } else {
      throw new Error("Please provide a question or image");
    }
    
    // If graph generation is enabled, call OpenRouter separately for graph data
    let graphResponse = "";
    if (canGenerateGraph && shouldGenerateGraph(question || "")) {
      try {
        graphResponse = await callOpenRouterGraph(question || "graph this equation");
        console.log("OpenRouter graph response:", graphResponse);
      } catch (graphError) {
        console.error("Graph generation failed:", graphError);
      }
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
    
    // Add graph data if generated (from OpenRouter/Mistral)
    if (canGenerateGraph && graphResponse) {
      const graphData = parseGraphData(graphResponse);
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
