/**
 * Detects spam/abuse patterns in AI output such as:
 * - Counting sequences (1, 2, 3, ... 1000)
 * - Monotonically increasing/repeating integer lists
 * - Trivial repeated patterns
 */
export function detectSpamOutput(text: string): boolean {
  if (!text || text.length < 200) return false;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 10) return false;

  // Check if >70% of lines are just integers or trivial patterns
  let integerLineCount = 0;
  for (const line of lines) {
    // Match lines that are just a number, optionally with punctuation like "1.", "2)", etc.
    if (/^\d[\d.,)\s]*$/.test(line)) {
      integerLineCount++;
    }
  }

  const integerRatio = integerLineCount / lines.length;
  if (integerRatio > 0.7 && lines.length > 15) return true;

  // Check for monotonically increasing sequences
  const numbers: number[] = [];
  for (const line of lines) {
    const match = line.match(/^(\d+)/);
    if (match) numbers.push(parseInt(match[1], 10));
  }

  if (numbers.length > 20) {
    let increasing = 0;
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] > numbers[i - 1]) increasing++;
    }
    if (increasing / (numbers.length - 1) > 0.85) return true;
  }

  return false;
}

export const SPAM_WARNING_MESSAGE =
  "This type of request is not allowed. Deep Mode provides explanations, not long enumerations.";
