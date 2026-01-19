import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// General Chat / Backup LLM uses openai/gpt-oss-120b
// Uses 7-key fallback rotation for high availability
// ============================================================
const GROQ_MODEL = "openai/gpt-oss-120b";

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
async function callGroqWithFallback(messages: any[]): Promise<string> {
  const apiKeys = getAvailableApiKeys();
  let lastError: Error | null = null;
  
  for (const { name, key } of apiKeys) {
    try {
      console.log(`Trying ${name} for follow-up chat...`);
      
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        }
      );

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
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error("No response content from API");
      }
      
      console.log(`Follow-up response generated successfully using ${name}`);
      return aiResponse;
      
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();

    console.log("Follow-up chat request:", { message, subject: context?.subject, model: GROQ_MODEL });

    const systemPrompt = `You are StudyBro AI, a chill, helpful homework assistant. You're continuing a conversation about a ${context?.subject || "homework"} problem.

Original question: ${context?.question || "Image question"}

Your previous solution:
${context?.solution || "No previous solution"}

Now help with follow-up questions. Be friendly, clear, and educational. Use markdown for formatting and LaTeX for math (wrap inline math in $...$ and display math in $$...$$). If they ask for a different method, provide one. If they don't understand, explain differently.`;

    // Build messages array for Groq
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    // Call Groq API with fallback rotation
    const aiResponse = await callGroqWithFallback(messages);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in follow-up-chat:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
