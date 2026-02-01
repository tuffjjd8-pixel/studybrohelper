/**
 * Intent routing logic for differentiating between quiz requests and solve requests
 */

// Keywords that indicate a quiz/test request
const QUIZ_KEYWORDS = [
  'quiz',
  'mcq',
  'mcqs',
  'multiple choice',
  'practice questions',
  'practice test',
  'test me',
  'test my knowledge',
  'generate questions',
  'make questions',
  'create questions',
  'give me questions',
  'study questions',
];

// Keywords that indicate a solve/equation request (should NOT trigger quiz)
const SOLVE_KEYWORDS = [
  'equation',
  'equations',
  'solve',
  'calculate',
  'compute',
  'simplify',
  'derive',
  'integrate',
  'differentiate',
  'factor',
  'expand',
  'evaluate',
  'find x',
  'find the value',
  'what is',
  'how to solve',
];

export interface IntentResult {
  intent: 'quiz' | 'solve' | 'none';
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
}

/**
 * Determines the user's intent based on their input text.
 * Prioritizes solve/equation detection to prevent misrouting.
 */
export function detectIntent(input: string): IntentResult {
  const normalizedInput = input.toLowerCase().trim();
  
  if (!normalizedInput) {
    return { intent: 'none', confidence: 'low' };
  }

  // First check for solve/equation keywords - these take priority
  for (const keyword of SOLVE_KEYWORDS) {
    if (normalizedInput.includes(keyword)) {
      return { 
        intent: 'solve', 
        confidence: 'high',
        matchedKeyword: keyword 
      };
    }
  }

  // Then check for quiz keywords
  for (const keyword of QUIZ_KEYWORDS) {
    if (normalizedInput.includes(keyword)) {
      return { 
        intent: 'quiz', 
        confidence: 'high',
        matchedKeyword: keyword 
      };
    }
  }

  return { intent: 'none', confidence: 'low' };
}

/**
 * Checks if the input looks like it's asking to solve an equation
 */
export function isSolveRequest(input: string): boolean {
  const result = detectIntent(input);
  return result.intent === 'solve';
}

/**
 * Checks if the input is explicitly asking for a quiz
 */
export function isQuizRequest(input: string): boolean {
  const result = detectIntent(input);
  return result.intent === 'quiz';
}
