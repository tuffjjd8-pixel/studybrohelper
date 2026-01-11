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
function getQuestionCount(isPremium: boolean, isPatternMode: boolean): number {
  if (isPatternMode) {
    return isPremium ? 8 : 5;
  }
  return isPremium ? 10 : 5;
}

// Base system prompt for all quiz modes
const BASE_SYSTEM_PROMPT = `You are the Quiz Engine for StudyBro.
Your ONLY job is to generate quizzes in clean JSON.
Never correct the user.
Never add commentary.
Never output anything except JSON.

OUTPUT FORMAT (STRICT):
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "answer": "A",
    "explanation": "..."
  }
]

ABSOLUTE RULES:
- ONLY output JSON
- NEVER output markdown
- NEVER output text outside the JSON
- NEVER change the number of questions
- No backticks, no comments, no trailing commas, no extra fields
- Double-escape backslashes in LaTeX: use \\\\ not \\

EXPLANATION RULES:
- Be short and student-friendly
- Use LaTeX when helpful
- Describe the logic or pattern
- NEVER use generic filler like:
  - "This is the correct answer based on the topic"
  - "This follows the rules of mathematics"
  - "The correct answer is A because it is correct"

FAILURE HANDLING:
- If input is unclear, make the best reasonable assumption
- Still output valid JSON
- Never refuse, never apologize, never output errors`;

// Pattern Mode prompt (Pro Feature)
function getPatternPrompt(patternExample: string, count: number) {
  return {
    system: `${BASE_SYSTEM_PROMPT}

PATTERN MODE RULES:
You must generate EXACTLY ${count} questions.

The user provides an example like "34 x 43 = 344334".
This is NOT normal math. Do NOT correct the math.
Do NOT assume the example is wrong.
Treat the example as a TRANSFORMATION RULE.

YOUR JOB:
1. Analyze the structure and transformation in the example
2. Infer the pattern, even if the math looks "incorrect"
3. Generate EXACTLY ${count} new questions following the SAME transformation
4. Use LaTeX for all math expressions

PATTERN EXAMPLES:
- "34 x 43 = 344334" → concatenate the two numbers
- "2 + 3 = 10" → pattern might be a*b + a² or (a+b)*a
- "5 - 2 = 15" → pattern might be a*b + a

QUESTION FORMAT:
- Use LaTeX: \\\\( 12 \\\\times 21 = ? \\\\)
- Apply the SAME transformation as the example

OPTIONS FORMAT:
- Provide 4 DISTINCT answer choices with ACTUAL VALUES
- Options must NOT be placeholders like "A", "B", "C", "D"
- Correct answer should follow the pattern

EXPLANATION FORMAT:
- Describe the PATTERN, not real math
- Example: "Pattern: concatenate the numbers. 12 and 21 → 1221"

CRITICAL:
- NEVER correct the example - it defines the pattern
- NEVER replace the pattern with real arithmetic
- If pattern is ambiguous, choose the most consistent interpretation`,
    user: `Example: ${patternExample}

This defines the transformation pattern. Generate EXACTLY ${count} questions using the SAME pattern. Do NOT use normal math. Output ONLY the JSON array.`
  };
}

// Standard Mode prompt - auto-determines difficulty
function getStandardPrompt(subject: string, question: string, solution: string, count: number) {
  return {
    system: `${BASE_SYSTEM_PROMPT}

STANDARD MODE RULES:
You must generate EXACTLY ${count} questions.

- Determine difficulty automatically based on topic complexity
- Use LaTeX for all math expressions
- Never mention difficulty in the question text

QUESTION FORMAT:
- Use LaTeX: \\\\( \\\\frac{3}{4} \\\\) or \\\\( 2x + 5 = 13 \\\\)
- Questions must be clear and grade-appropriate

OPTIONS FORMAT:
- Provide 4 DISTINCT answer choices with ACTUAL VALUES
- Options must NOT be placeholders like "A", "B", "C", "D"
- Each option must be a valid answer (e.g., "24", "\\\\( \\\\frac{5}{8} \\\\)", "True", "x = 5")

ANSWER FORMAT:
- Specify the correct answer by letter: "A", "B", "C", or "D"

EXPLANATION FORMAT:
- Explain the logic or steps used to solve the question
- Use LaTeX in explanations when needed
- Keep it short and student-friendly`,
    user: `Subject: ${subject || "General"}
Problem: ${question || "Study material"}
Solution: ${solution}

Generate EXACTLY ${count} questions. Output ONLY the JSON array.`
  };
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
      mode = "standard", 
      patternExample,
      isPremium = false
    } = body;
    
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GROQ_API_KEY_BACKUP = Deno.env.get("GROQ_API_KEY_BACKUP");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const isPatternMode = mode === "pattern" && patternExample;
    const questionCount = getQuestionCount(isPremium, isPatternMode);
    const maxTokens = getMaxTokens(questionCount);
    
    console.log("Generating quiz:", { 
      mode: isPatternMode ? "pattern" : "standard",
      subject, 
      count: questionCount,
      isPremium
    });

    const prompts = isPatternMode 
      ? getPatternPrompt(patternExample, questionCount)
      : getStandardPrompt(subject, question, solution, questionCount);

    const messages = [
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user }
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
