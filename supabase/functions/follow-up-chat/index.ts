import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION
// Use llama-3.1-70b-versatile for ALL text/reasoning tasks
// ============================================================
const GROQ_MODEL = "llama-3.1-70b-versatile";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();
    
    // Import key rotation
    const { callGroqWithRotation } = await import("../_shared/groq-key-manager.ts");

    console.log("Follow-up chat request:", { message, subject: context?.subject });

    const systemPrompt = `You are StudyBro AI, a chill, helpful homework assistant. You're continuing a conversation about a ${context?.subject || "homework"} problem.

Original question: ${context?.question || "Image question"}

Your previous solution:
${context?.solution || "No previous solution"}

Now help with follow-up questions. Be friendly, clear, and educational. Use markdown for formatting and LaTeX for math (wrap inline math in $...$ and display math in $$...$$). If they ask for a different method, provide one. If they don't understand, explain differently.`;

    // Build messages array for Groq
    const messages: { role: string; content: string }[] = [
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

    // Call Groq API with key rotation
    const response = await callGroqWithRotation(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }
    );

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
