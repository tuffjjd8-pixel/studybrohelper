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
// Primary API Key: GROQ_API_KEY_6 (with fallback)
// NOTE: Using llama-3.3-70b-versatile as fallback since gpt-oss models may not be available on Groq
// ============================================================
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Get API key with fallback support
function getGroqApiKey(): string {
  // Primary key for general chat
  const primaryKey = Deno.env.get("GROQ_API_KEY_6");
  if (primaryKey) return primaryKey;
  
  console.log("GROQ_API_KEY_6 not found, trying fallbacks...");
  
  // Fallback keys in order
  const backupKeys = [
    "GROQ_API_KEY",
    "GROQ_API_KEY_BACKUP",
    "GROQ_API_KEY_1",
    "GROQ_API_KEY_2",
  ];
  
  for (const keyName of backupKeys) {
    const key = Deno.env.get(keyName);
    if (key) {
      console.log(`Using fallback key: ${keyName}`);
      return key;
    }
  }
  
  throw new Error("No GROQ API key configured");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();
    
    let GROQ_API_KEY: string;
    try {
      GROQ_API_KEY = getGroqApiKey();
    } catch (e) {
      console.error("API key error:", e);
      throw new Error("GROQ_API_KEY is not configured");
    }

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

    // Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
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
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Sorry bro, I couldn't process that. Try again!";

    console.log("Follow-up response generated successfully");

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
