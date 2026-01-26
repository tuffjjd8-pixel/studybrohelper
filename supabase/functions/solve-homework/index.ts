import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Vision model for images: "meta-llama/llama-4-scout-17b-16e-instruct" (Groq)
// Text model for text-only: "llama-3.3-70b-versatile" (Groq) - Best quality
// Graph model: LLaMA 3.3 70B via OpenRouter (free tier, structured JSON)
// ============================================================
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_GRAPH_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// ============================================================
// TIER LIMITS
// ============================================================
const FREE_ANIMATED_STEPS = 5;
const PREMIUM_ANIMATED_STEPS = 16;
const FREE_GRAPHS_PER_DAY = 4;
const PREMIUM_GRAPHS_PER_DAY = 15;

// Greeting options for natural variety
const GREETINGS = [
  "Yo, your homework bro StudyBro is here 👋",
  "Hey, your StudyBro is ready to help 👋",
  "What's good, your homework bro StudyBro just pulled up 👋",
  "Sup, your StudyBro is locked in 👋",
  "Hey there, your homework bro StudyBro reporting in 👋",
  "StudyBro online and ready to solve 👋",
  "Your homework bro StudyBro is connected and ready 👋",
  "StudyBro activated — let's break this down 👋",
  "Your StudyBro is online and ready to help 👋",
  "StudyBro here — let's get this solved 👋",
  "Ayo, your homework bro StudyBro just synced in 👋",
  "StudyBro in the building — let's cook 👋",
  "Alright, your homework bro StudyBro is here 👋",
  "StudyBro just pulled up — let's lock in 👋",
  "Charged up and ready — your StudyBro is here 👋"
];

function getRandomGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

// System prompt for free users - supports ALL subjects
const FREE_SYSTEM_PROMPT = `You are StudyBro AI, the user's fast, friendly, reliable homework helper — their homework bro.

## RESPONSE FORMAT (CRITICAL):
Your response MUST follow this EXACT structure:

[GREETING_PLACEHOLDER] (StudyBro AI)

🎉 **Solved!**

✓ **Final Answer**
[Your clear, correct, student-friendly final answer here]

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
1. ALWAYS give the FULL solution, not partial
2. ALWAYS answer the question directly
3. Keep explanations clean and student-friendly
4. NEVER output JSON
5. NEVER hallucinate formulas

## Tone:
- Friendly, casual, supportive — like texting a smart friend
- Keep explanations concise but clear`;

// Enhanced system prompt for premium users - supports ALL subjects with priority reasoning
const PREMIUM_SYSTEM_PROMPT = `You are StudyBro AI Premium, the user's fast, friendly, reliable homework helper — their homework bro. You provide the most detailed and accurate solutions with enhanced reasoning.

## RESPONSE FORMAT (CRITICAL):
Your response MUST follow this EXACT structure:

[GREETING_PLACEHOLDER] (StudyBro AI Premium)

🎉 **Solved!**

✓ **Final Answer**
[Your clear, correct, student-friendly final answer here]

[Then provide connected, logical animated steps that fully explain the reasoning and clearly lead to the final answer]

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
1. ALWAYS give the FULL solution, not partial
2. ALWAYS answer the question directly
3. Use LaTeX for math when helpful
4. Keep explanations clean and student-friendly
5. NEVER output JSON
6. NEVER hallucinate formulas
7. NEVER skip key reasoning in steps
8. Verify solutions when applicable

## Animated Steps Rules:
- Steps must be connected and logical
- Steps must fully explain the reasoning
- Steps must NOT be random or disconnected
- Steps must clearly lead to the final answer

## Tone:
- Friendly, casual, supportive — like texting a smart friend
- Human-like explanations that are easy to follow
- Keep everything clean, readable, and beautifully formatted`;

// Prompt to generate structured animated steps - optimized for fewer steps without losing clarity
function getAnimatedStepsPrompt(maxSteps: number): string {
  return `

IMPORTANT: Structure your response efficiently using FEWER steps when possible.
- Use ${maxSteps} steps as the MAXIMUM, not the target
- Combine related concepts into single steps when it improves clarity
- Simple problems: 2-3 steps. Medium: 4-6 steps. Complex only: up to ${maxSteps} steps
- Each step should be self-contained and build on the previous

Format each step as:
**Step N: [Title]**
[Content with LaTeX formatting]

Keep each step focused but don't artificially split simple operations.`;
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

// Call Groq API for text-only input
async function callGroqText(
  question: string, 
  isPremium: boolean,
  animatedSteps: boolean
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
  
  console.log("Calling Groq Text API with model:", GROQ_TEXT_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

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
  animatedSteps: boolean
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

  const textContent = question || "Please solve this homework problem from the image. Identify the subject and provide a step-by-step solution.";
  
  console.log("Calling Groq Vision API with model:", GROQ_VISION_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

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

// Remove graph block and inject greeting into solution text
function cleanSolutionText(solution: string, isPremium: boolean): string {
  const greeting = getRandomGreeting();
  
  // Replace the placeholder with the actual greeting
  let cleaned = solution.replace(/\[GREETING_PLACEHOLDER\]/g, greeting);
  
  // Remove graph code blocks
  cleaned = cleaned.replace(/```graph\n?[\s\S]*?\n?```/g, "");
  
  return cleaned.trim();
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
      solution: cleanSolutionText(solution, isPremium),
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
