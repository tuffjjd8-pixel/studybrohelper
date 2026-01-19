import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Quiz Generator uses llama-3.3-70b-versatile for heavy reasoning
// Uses 7-key fallback rotation for high availability
// ============================================================
const GROQ_MODEL = "llama-3.3-70b-versatile";

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

// Call Groq API with fallback key rotation
async function callGroqWithFallback(systemPrompt: string, conversationText: string): Promise<string> {
  const apiKeys = getAvailableApiKeys();
  let lastError: Error | null = null;
  
  for (const { name, key } of apiKeys) {
    try {
      console.log(`Trying ${name} for quiz generation...`);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: conversationText },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${name} failed:`, response.status, errorText);
        
        // If rate limited, try next key
        if (response.status === 429) {
          lastError = new Error(`Rate limit exceeded on ${name}`);
          continue;
        }
        
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("No content from model");
      }
      
      console.log(`Quiz generated successfully using ${name}`);
      return content;
      
    } catch (error) {
      console.error(`${name} error:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next key
    }
  }
  
  // All keys failed
  throw lastError || new Error("All API keys failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationText, questionCount = 5, subject, strictCountMode = true } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "conversationText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = strictCountMode 
      ? `Generate EXACTLY ${questionCount} multiple-choice questions based on the provided content.

STRICT COUNT MODE IS ON:
- You MUST generate exactly ${questionCount} questions, no more, no less
- If the conversation doesn't have enough information, expand using well-known, factual, widely accepted information related to the topic
- Do NOT invent fake facts or hallucinate. Only use verifiable, commonly known information to expand
- Each question must have exactly 4 options labeled A, B, C, D
- Include the correct answer letter (A, B, C, or D)
- Include a SHORT explanation (1-2 sentences max) for why the answer is correct
- Return ONLY valid JSON array, no markdown, no extra text
- Subject context: ${subject || "general"}

OUTPUT FORMAT:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"Short explanation here."}]

Return ONLY the JSON array.`
      : `Generate multiple-choice questions based on the provided content.

ADAPTIVE MODE (Strict Count OFF):
- Target: ${questionCount} questions, but only if the content supports it
- If the conversation is too short or limited, generate FEWER questions rather than making things up
- Do NOT hallucinate or invent information. Only create questions from what's actually in the content
- Each question must have exactly 4 options labeled A, B, C, D
- Include the correct answer letter (A, B, C, or D)
- Include a SHORT explanation (1-2 sentences max) for why the answer is correct
- Return ONLY valid JSON array, no markdown, no extra text
- Subject context: ${subject || "general"}

OUTPUT FORMAT:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"Short explanation here."}]

Return ONLY the JSON array.`;

    console.log(`Quiz generation request - model: ${GROQ_MODEL}, strictCountMode: ${strictCountMode}, questionCount: ${questionCount}`);

    // Call Groq API with fallback rotation
    const content = await callGroqWithFallback(systemPrompt, conversationText);

    // Parse the JSON response
    let quiz;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      quiz = JSON.parse(cleanContent);

      // Validate structure
      if (!Array.isArray(quiz)) {
        throw new Error("Response is not an array");
      }

      // Ensure each question has required fields
      quiz = quiz.map((q: any, i: number) => ({
        question: q.question || `Question ${i + 1}`,
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
        answer: q.answer || "A",
        explanation: q.explanation || "This is the correct answer based on the material.",
      }));

    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse quiz response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quiz generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
