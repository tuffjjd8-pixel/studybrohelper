import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function callGroqAPI(apiKey: string, messages: any[], temperature: number, maxTokens: number) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  return response;
}

// Determine question count based on tier
function getQuestionCount(isPremium: boolean): number {
  return isPremium ? 10 : 5;
}

// System prompt for quiz generation
function getSystemPrompt(count: number): string {
  return `You are the Quiz Engine for StudyBro.
Only generate multiple-choice quizzes in clean JSON.
Never output anything except JSON.
Never break formatting.

OUTPUT FORMAT:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "answer": "A",
    "explanation": "..."
  }
]

No markdown.
No text before or after.
No extra fields.
No trailing commas.

QUIZ RULES:
- Generate EXACTLY ${count} questions
- Questions must match the topic
- 4 meaningful options
- Use LaTeX for math
- Explanations must be short and student-friendly
- No difficulty labels
- No patterns
- No polls
- No step-by-step reasoning
- If math fails, use word-based questions

EXPLANATION RULES:
- Be short
- Be clear
- Use LaTeX when helpful
- Explain the logic
- Never use filler like:
  - "This is correct because it is correct"
  - "This follows the rules of mathematics"
  - "Step 1, Step 2…"

FAILURE HANDLING:
- If unclear, make a reasonable assumption
- Still output valid JSON
- Still generate EXACTLY ${count} questions
- Never refuse
- Never apologize
- Never break JSON`;
}

// Build user prompt
function getUserPrompt(subject: string, question: string, solution: string, count: number): string {
  return `Topic: ${subject || "General"}
Problem: ${question || "Study material"}
Solution: ${solution}

Generate EXACTLY ${count} multiple-choice questions based on this material. Output ONLY the JSON array.`;
}

// Calculate max tokens based on question count
function getMaxTokens(count: number): number {
  return Math.min(Math.max(count * 500, 800), 5000);
}

// Robust JSON sanitization with LaTeX support
function sanitizeJsonString(str: string): string {
  // Remove markdown code blocks
  str = str.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  str = str.trim();
  
  // Try to extract array or object
  const arrayMatch = str.match(/\[[\s\S]*\]/);
  const objectMatch = str.match(/\{[\s\S]*\}/);
  
  if (arrayMatch) {
    str = arrayMatch[0];
  } else if (objectMatch) {
    str = objectMatch[0];
  }
  
  // Remove trailing commas before ] or }
  str = str.replace(/,\s*([}\]])/g, '$1');
  
  return str;
}

// Convert array format to our internal format
function normalizeQuestions(data: any): any[] {
  let questions: any[] = [];
  
  // Handle array format: [{"question":...,"answer":"A"}]
  if (Array.isArray(data)) {
    questions = data;
  }
  // Handle object format: {"questions":[...]}
  else if (data.questions && Array.isArray(data.questions)) {
    questions = data.questions;
  }
  
  return questions.map((q: any) => {
    // Convert "answer": "A" to correctIndex: 0
    let correctIndex = 0;
    if (typeof q.answer === 'string') {
      const answerMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      correctIndex = answerMap[q.answer.toUpperCase()] ?? 0;
    } else if (typeof q.correctIndex === 'number') {
      correctIndex = q.correctIndex;
    }
    
    return {
      question: q.question || "Question",
      options: q.options || ["A", "B", "C", "D"],
      correctIndex,
      explanation: q.explanation || "Review the solution."
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      subject, 
      question, 
      solution, 
      isPremium = false
    } = body;
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_BACKUP = Deno.env.get("GROQ_API_KEY_BACKUP");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const questionCount = getQuestionCount(isPremium);
    const maxTokens = getMaxTokens(questionCount);
    
    console.log("Generating quiz:", { 
      subject, 
      count: questionCount,
      isPremium
    });

    const messages = [
      { role: "system", content: getSystemPrompt(questionCount) },
      { role: "user", content: getUserPrompt(subject, question, solution, questionCount) }
    ];

    let response = await callGroqAPI(GROQ_API_KEY, messages, 0.2, maxTokens);

    if (!response.ok && GROQ_API_KEY_BACKUP) {
      console.log("Primary API failed, trying backup...");
      response = await callGroqAPI(GROQ_API_KEY_BACKUP, messages, 0.2, maxTokens);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      if (response.status === 429) {
        throw new Error("Rate limited - please try again");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Raw response:", content.substring(0, 300));

    const sanitizedJson = sanitizeJsonString(content);
    
    let parsedData;
    try {
      parsedData = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Sanitized content:", sanitizedJson.substring(0, 300));
      throw new Error("Failed to parse quiz response");
    }

    const validQuestions = normalizeQuestions(parsedData).filter((q: any) => 
      q.question && 
      Array.isArray(q.options) && 
      q.options.length >= 4 &&
      typeof q.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3
    ).map((q: any) => ({
      ...q,
      explanation: q.explanation && !q.explanation.toLowerCase().includes("this is the correct answer") 
        ? q.explanation 
        : "Review the solution steps to understand this concept."
    }));

    if (validQuestions.length === 0) {
      throw new Error("No valid questions generated");
    }

    console.log(`Generated ${validQuestions.length}/${questionCount} questions`);

    return new Response(
      JSON.stringify({ questions: validQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quiz generation error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        questions: [{
          question: "Quiz generation failed. Did you understand the solution?",
          options: ["Yes, I understood it", "Mostly understood", "Need more practice", "Not really"],
          correctIndex: 0,
          explanation: "Please try generating the quiz again."
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
