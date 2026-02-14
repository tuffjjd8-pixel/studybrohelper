import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Free tier:  llama-3.1-8b-instant (fast, lightweight)
// Pro tier:   llama-3.3-70b-versatile (full reasoning)
// Vision:     llama-4-scout (image processing) — Pro only
// Graph:      LLaMA 3.3 70B via OpenRouter (free tier, structured JSON)
// ============================================================
const FREE_TEXT_MODEL = "llama-3.1-8b-instant";
const PRO_TEXT_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const OPENROUTER_GRAPH_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// ============================================================
// TIER LIMITS
// ============================================================
const FREE_MAX_SECTIONS = 5;     // Max breakdown sections for free users
const PREMIUM_MAX_SECTIONS = 16; // Max breakdown sections for premium users
const FREE_GRAPHS_PER_DAY = 4;
const PREMIUM_GRAPHS_PER_DAY = 15;

// No greeting — answers are delivered instantly without preamble

// Shared formatting rules used by both tiers
const SHARED_FORMATTING_RULES = `
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

## Pattern-Based Equations (Non-Standard Arithmetic)
For equations like "a + b = result" where the result is NOT standard addition:
- Find a SINGLE simple pattern that fits ALL given examples and explain it in 1-3 short sentences`;

// System prompt for free users (INSTANT MODE — final answer only)
const FREE_SYSTEM_PROMPT = `You are StudyBro — a fast, clean, founder-built homework solver. Calm, sharp, zero fluff. Like a smart friend who just gives you the answer.

## QUESTION DETECTION:
- If the user message does NOT contain a solvable question, equation, prompt, or task, respond ONLY with: "I need a clear question to solve."
- Do NOT invent a question. Do NOT answer random text or statements.

## MODE: INSTANT
- Output ONLY the final answer. Nothing else.
- No explanation. No reasoning. No derivation. No commentary.
- No numbered lists. No bullet points describing how to solve it.
- Never use the word "steps" or number your reasoning.
- If the question is vague or has blanks, auto-fill with the most likely interpretation and answer immediately.

## GRAPH / WORD PROBLEMS:
- For graph questions: give only the final result (intercepts, slope, key points). No steps.
- For word problems: give only the final answer. No steps.

## NON-MATH QUESTIONS:
- Treat all subjects the same: Instant = answer only. Never produce steps for ANY subject.

## ESSAY / WRITING EXCEPTION:
- If the user asks for an essay, paragraph, story, letter, speech, or any writing task, produce FULL-LENGTH writing as requested.
- Do NOT shorten or summarize writing tasks. Give the complete output.
- Instant Mode rules (no explanation) do NOT apply to writing tasks.

## STRICT RULES:
- Never hallucinate formulas.
- Never output JSON.
- Never mention internal logic, limits, modes, or tiers.
- Never mention cropping, OCR, or image processing.
- Treat all input (text or OCR) as a homework question.
- No labels like "Solved!" or "Final Answer:"
- No emojis unless the user uses them first
- No upsells or mention of Premium features
${SHARED_FORMATTING_RULES}`;

// System prompt for premium users (DEEP MODE — answer + short explanation)
const PREMIUM_SYSTEM_PROMPT = `You are StudyBro Premium — a fast, clean, founder-built homework solver. Calm, sharp, zero fluff. Like a smart friend explaining things clearly.

## QUESTION DETECTION:
- If the user message does NOT contain a solvable question, equation, prompt, or task, respond ONLY with: "I need a clear question to solve."
- Do NOT invent a question. Do NOT answer random text or statements.

## MODE: DEEP
- First, give the correct final answer clearly.
- Then, provide a short, natural explanation (2–4 sentences max).
- The explanation should feel like a smart friend casually explaining — not a textbook.
- Never use the word "steps" or number your reasoning.
- Never produce long breakdowns, numbered lists, or multi-paragraph explanations.
- If the question is vague or has blanks, auto-fill with the most likely interpretation and answer immediately.

## GRAPH / WORD PROBLEMS:
- For graph questions: give the result (intercepts, slope, key points) + short 2-4 sentence explanation. No steps.
- For word problems: give the answer + short explanation. No steps.

## NON-MATH QUESTIONS:
- Treat all subjects the same: answer + short explanation. Never produce steps for ANY subject.

## ESSAY / WRITING EXCEPTION:
- If the user asks for an essay, paragraph, story, letter, speech, or any writing task, produce FULL-LENGTH writing as requested.
- Do NOT shorten or summarize writing tasks. Give the complete output.
- Deep Mode rules do NOT apply to writing tasks — just write the full piece.

## STRICT RULES:
- Never hallucinate formulas.
- Never output JSON.
- Never mention internal logic, limits, or modes.
- Never mention cropping, OCR, or image processing.
- Treat all input (text or OCR) as a homework question.
- No labels like "Solved!"
- No emojis unless the user uses them first
- Verify all work before responding
${SHARED_FORMATTING_RULES}

## Subject-Specific Guidelines:

### Science (Physics, Chemistry, Biology):
- Include relevant formulas with units
- Explain concepts with real-world examples in 2-4 sentences

### History:
- Provide key dates and significance concisely

### Literature/Writing:
- Give original, well-structured content with a clear thesis

### Coding:
- Use proper syntax highlighting
- Brief explanation of the logic`;

// Prompt to generate structured breakdown sections (no numbered steps)
// Free users get a condensed view, premium users get detailed reasoning
function getAnimatedSectionsPrompt(maxSections: number, isPremium: boolean): string {
  if (isPremium) {
    return `

BREAKDOWN MODE — PREMIUM (DETAILED):
- You are NOT allowed to recompute the answer.
- You MUST follow the solver's final answer exactly.
- You MUST NOT contradict the solver or introduce new numbers.
- Break the reasoning into 3-6 titled sections. Each section is a short paragraph (2-4 sentences).
- NEVER use numbered lists, bullet reasoning, or the word "steps".
- End with: "Final Answer: {answer}"

Use ${maxSections} sections as the MAXIMUM, not the target.

Format each section as:
**[Section Title]**
[Content with LaTeX formatting and natural explanation]`;
  }

  // Free users get condensed sections
  return `

BREAKDOWN MODE — SIMPLIFIED:
- You are NOT allowed to recompute the answer.
- You MUST follow the solver's final answer exactly.
- Break the reasoning into 2-4 titled sections. Keep each to 1-2 sentences.
- NEVER use numbered lists, bullet reasoning, or the word "steps".
- End with: "Final Answer: {answer}"

Use ${maxSections} sections as the MAXIMUM.

Format each section as:
**[Section Title]**
[Brief content with LaTeX formatting]`;
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

// Import key rotation utilities
import { 
  getActiveKey, 
  markKeyUsed, 
  markKeyRateLimited, 
  markKeyFailed,
  callGroqWithRotation 
} from "../_shared/groq-key-manager.ts";
import { logUsage } from "../_shared/usage-logger.ts";

// Call Groq API for text-only input with key rotation
async function callGroqText(
  question: string, 
  isPremium: boolean,
  animatedSteps: boolean,
  solveMode: string = "instant"
): Promise<string> {
  // Select prompt based on effective mode, not just tier
  let systemPrompt = solveMode === "deep" ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  // Add breakdown sections instruction
  if (animatedSteps) {
    const maxSections = isPremium ? PREMIUM_MAX_SECTIONS : FREE_MAX_SECTIONS;
    systemPrompt += getAnimatedSectionsPrompt(maxSections, isPremium);
  }
  
  const textModel = isPremium ? PRO_TEXT_MODEL : FREE_TEXT_MODEL;
  console.log("Calling Groq Text API with model:", textModel, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

  const response = await callGroqWithRotation(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: textModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: isPremium ? 0.5 : 0.7,
      max_tokens: isPremium ? 8192 : 4096,
    }
  );

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't solve this problem.";
}

// Call Groq API for image input (Vision model) - Enhanced OCR for premium with key rotation
async function callGroqVision(
  question: string, 
  imageBase64: string, 
  mimeType: string, 
  isPremium: boolean,
  animatedSteps: boolean,
  solveMode: string = "instant"
): Promise<string> {
  let systemPrompt = solveMode === "deep" ? PREMIUM_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
  
  // Premium gets enhanced OCR instructions
  if (isPremium) {
    systemPrompt += `

## Enhanced Image Processing (Premium):
- Extract ALL text from the image with high accuracy
- Preserve mathematical notation and formatting exactly as shown
- Identify handwritten vs printed text and handle appropriately
- If the image quality is poor, state what you can read and any uncertainties`;
  }
  
  // Add breakdown sections instruction
  if (animatedSteps) {
    const maxSections = isPremium ? PREMIUM_MAX_SECTIONS : FREE_MAX_SECTIONS;
    systemPrompt += getAnimatedSectionsPrompt(maxSections, isPremium);
  }

  const textContent = question || "Please solve this homework problem from the image. Identify the subject and provide the answer.";
  
  console.log("Calling Groq Vision API with model:", GROQ_VISION_MODEL, "Premium:", isPremium, "AnimatedSteps:", animatedSteps);

  const response = await callGroqWithRotation(
    "https://api.groq.com/openai/v1/chat/completions",
    {
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
    }
  );

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

// Remove graph blocks from solution text
function cleanSolutionText(solution: string, _isPremium: boolean): string {
  let cleaned = solution;
  
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
      userGraphCount = 0,
      solveMode = "instant",
      deviceType = "web"
    } = await req.json();
    
    // Enforce: free users are ALWAYS instant, regardless of what's sent
    const effectiveMode = isPremium ? solveMode : "instant";
    
    // Check graph limit
    const maxGraphs = isPremium ? PREMIUM_GRAPHS_PER_DAY : FREE_GRAPHS_PER_DAY;
    const canGenerateGraph = generateGraph && userGraphCount < maxGraphs;
    
    if (generateGraph && !canGenerateGraph) {
      console.log(`Graph limit reached: ${userGraphCount}/${maxGraphs} (Premium: ${isPremium})`);
    }
    
    let solution: string;
    let modelUsed: string;
    let ocrEngineUsed: string = "none";

    // Route to appropriate model based on input type and tier
    if (image) {
      if (!isPremium) {
        // Free users: no vision model, extract text concept only via text model
        // Still use vision for basic OCR but log as free tier
        ocrEngineUsed = "free_groq_vision";
        modelUsed = GROQ_VISION_MODEL;
      } else {
        // Pro users: full enhanced vision OCR
        ocrEngineUsed = "pro_groq_vision_enhanced";
        modelUsed = GROQ_VISION_MODEL;
      }
      
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
        effectiveMode
      );
    } else if (question) {
      // Text-only input → route to tier-appropriate text model
      modelUsed = isPremium ? PRO_TEXT_MODEL : FREE_TEXT_MODEL;
      solution = await callGroqText(question, isPremium, animatedSteps, effectiveMode);
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
      tier: isPremium ? "premium" : "free",
      debug: {
        model_used: modelUsed!,
        ocr_engine_used: ocrEngineUsed,
        device_type: deviceType,
        solve_mode: effectiveMode,
      }
    };
    
    // Add breakdown sections if requested
    if (animatedSteps) {
      const maxSections = isPremium ? PREMIUM_MAX_SECTIONS : FREE_MAX_SECTIONS;
      responseData.steps = parseAnimatedSteps(solution, maxSections);
      responseData.maxSteps = maxSections;
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
      animatedSteps: isPremium ? PREMIUM_MAX_SECTIONS : FREE_MAX_SECTIONS,
      graphsPerDay: maxGraphs,
      graphsUsed: canGenerateGraph && responseData.graph ? userGraphCount + 1 : userGraphCount,
      hasEnhancedOCR: isPremium,
      hasPriorityResponse: isPremium,
      hasModelSelection: isPremium
    };

    console.log("Solution generated, subject:", subject, "model:", modelUsed!, "ocr:", ocrEngineUsed, "device:", deviceType, "steps:", responseData.steps ? (responseData.steps as Array<unknown>).length : 0, "hasGraph:", !!responseData.graph);

    // Log usage (fire-and-forget)
    const authHeader = req.headers.get("Authorization");
    let logUserId: string | null = null;
    if (authHeader) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: { user: u } } = await sb.auth.getUser();
        logUserId = u?.id || null;
      } catch (_) {}
    }
    logUsage("solve", 0.0012, logUserId);

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
