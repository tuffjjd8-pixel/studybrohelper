import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationText, questionCount = 5, subject } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "conversationText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GROQ_API_KEY_BACKUP");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a quiz generator. Generate exactly ${questionCount} multiple-choice questions based on the provided conversation/solution content.

RULES:
- Each question must have exactly 4 options labeled A, B, C, D
- One correct answer per question
- Questions should test understanding of the material
- Return ONLY valid JSON, no explanations or markdown
- Subject context: ${subject || "general"}

OUTPUT FORMAT (strict JSON array):
[
  {"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A"},
  ...
]

Return ONLY the JSON array, nothing else.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
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
      console.error("Groq API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Quiz generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content from model" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
