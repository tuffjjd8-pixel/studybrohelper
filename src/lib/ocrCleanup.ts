/**
 * OCR cleanup & normalization for math/equation inputs.
 * Runs after OCR text extraction, before sending to the reasoning model.
 * Fixes common misreads: minus signs, z↔2, S↔5, A↔4, spacing, broken lines.
 */

const UNICODE_MINUS = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D\u00AD]/g;
const UNICODE_PLUS = /[\uFF0B\uFE62]/g;
const UNICODE_EQUALS = /[\uFF1D\u2550]/g;
const UNICODE_MULT = /[\u00D7\u22C5\u2219]/g;
const FANCY_QUOTES = /[\u2018\u2019\u201C\u201D]/g;

/** Tokens that look like equation operators/structure. */
const OP_CHARS = "+\\-=";
const VARS = "a-zA-Z";

function normalizePunctuation(s: string): string {
  return s
    .replace(UNICODE_MINUS, "-")
    .replace(UNICODE_PLUS, "+")
    .replace(UNICODE_EQUALS, "=")
    .replace(UNICODE_MULT, "*")
    .replace(FANCY_QUOTES, "'")
    .replace(/\u00A0/g, " "); // nbsp
}

/** Per-character disambiguation in math contexts. */
function fixCharacterMisreads(s: string): string {
  let out = s;

  // S/s mistaken for 5 when adjacent to a variable (e.g. "Sy" → "5y", "Sx" → "5x")
  out = out.replace(/\bS([a-zA-Z])\b/g, (_m, v) => `5${v}`);
  out = out.replace(/(^|[\s+\-=(])s([a-zA-Z])\b/g, (_m, p, v) => `${p}5${v}`);

  // A mistaken for 4 when followed by a variable (e.g. "Ax" → "4x")
  out = out.replace(/\bA([a-zA-Z])\b/g, (_m, v) => `4${v}`);

  // O/o → 0 between digits or before a variable: "1Ox" → "10x", "2O" → "20"
  out = out.replace(/(\d)[oO](\d)/g, "$1$2".replace(/(\d)(\d)/, "$1" + "0" + "$2"));
  out = out.replace(/(\d)[oO](\d)/g, "$10$2");
  out = out.replace(/(\d)[oO]([a-zA-Z])/g, "$10$2");

  // l / I → 1 between digits: "2l" → "21", "I0" → "10"
  out = out.replace(/(\d)[lI](\d)/g, "$11$2");
  out = out.replace(/\bI(\d)/g, "1$1");

  // z → 2 when used numerically: "z=", " z+", "z -", "zx" only when surrounded by digits/operators
  // Be conservative: only replace standalone z next to digits/operators on BOTH sides or near "=".
  out = out.replace(/(?<=[\d+\-=(\s])z(?=[\d+\-=)\s])/g, "2");
  out = out.replace(/(?<=[\d+\-=(\s])Z(?=[\d+\-=)\s])/g, "2");

  // B → 8, G → 6, when between digits
  out = out.replace(/(\d)B(\d)/g, "$18$2");
  out = out.replace(/(\d)G(\d)/g, "$16$2");

  return out;
}

/** Make sure a faint minus rendered as "—" or " - " is preserved as a single minus,
 *  and ensure a number/variable on each side has the operator between them. */
function fixOperatorSpacing(s: string): string {
  let out = s;

  // Collapse repeated minuses that aren't intentional ("--" → "-")
  out = out.replace(/-{2,}/g, "-");

  // Ensure space-free "n-x", "x-n" become "n - x" friendly but normalized to single spaces
  // Insert spaces around binary operators between alphanumerics for readability,
  // then collapse multi-spaces.
  out = out.replace(/([0-9a-zA-Z\)])\s*([+\-=])\s*(?=[0-9a-zA-Z\(])/g, "$1 $2 ");
  out = out.replace(/[ \t]+/g, " ");

  // Implicit multiplication: "4 x" → "4x", "2 z" → "2z" (digit followed by var)
  out = out.replace(/(\d)\s+([a-zA-Z])\b/g, "$1$2");

  return out;
}

/** Reconstruct lines: an equation must contain "=" — merge wrapped lines that don't. */
function reconstructEquationLines(s: string): string {
  const rawLines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];

  for (const line of rawLines) {
    const startsWithOp = /^[+\-=]/.test(line);
    const prev = out[out.length - 1];

    if (prev && (startsWithOp || !/=/.test(prev))) {
      // continuation of previous equation
      out[out.length - 1] = `${prev} ${line}`.replace(/\s+/g, " ").trim();
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

/** Heuristic: does this look like math/equation content? */
function looksLikeMath(s: string): boolean {
  return /[=+\-]/.test(s) && /[a-zA-Z]/.test(s) && /\d/.test(s);
}

export interface CleanupResult {
  cleaned: string;
  changed: boolean;
  notes: string[];
}

export function cleanupOcrMath(raw: string): CleanupResult {
  const notes: string[] = [];
  if (!raw || !raw.trim()) return { cleaned: raw, changed: false, notes };

  let s = raw;
  const original = s;

  s = normalizePunctuation(s);
  if (s !== original) notes.push("normalized unicode punctuation");

  if (looksLikeMath(s)) {
    const before = s;
    s = fixCharacterMisreads(s);
    if (s !== before) notes.push("fixed character misreads (S→5, A→4, z→2, O→0, l/I→1)");

    const before2 = s;
    s = fixOperatorSpacing(s);
    if (s !== before2) notes.push("normalized operator spacing & implicit multiplication");

    const before3 = s;
    s = reconstructEquationLines(s);
    if (s !== before3) notes.push("reconstructed wrapped equation lines");
  }

  // Final whitespace tidy
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();

  return { cleaned: s, changed: s !== original, notes };
}
