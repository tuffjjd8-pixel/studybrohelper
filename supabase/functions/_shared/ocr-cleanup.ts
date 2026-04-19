/**
 * Server-side OCR cleanup & normalization for math/equation inputs.
 * Mirrors src/lib/ocrCleanup.ts so the edge function can normalize
 * PaddleOCR output before passing to GPT-OSS.
 */

const UNICODE_MINUS = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D\u00AD]/g;
const UNICODE_PLUS = /[\uFF0B\uFE62]/g;
const UNICODE_EQUALS = /[\uFF1D\u2550]/g;
const UNICODE_MULT = /[\u00D7\u22C5\u2219]/g;
const FANCY_QUOTES = /[\u2018\u2019\u201C\u201D]/g;

function normalizePunctuation(s: string): string {
  return s
    .replace(UNICODE_MINUS, "-")
    .replace(UNICODE_PLUS, "+")
    .replace(UNICODE_EQUALS, "=")
    .replace(UNICODE_MULT, "*")
    .replace(FANCY_QUOTES, "'")
    .replace(/\u00A0/g, " ");
}

function fixCharacterMisreads(s: string): string {
  let out = s;
  out = out.replace(/\bS([a-zA-Z])\b/g, (_m, v) => `5${v}`);
  out = out.replace(/(^|[\s+\-=(])s([a-zA-Z])\b/g, (_m, p, v) => `${p}5${v}`);
  out = out.replace(/\bA([a-zA-Z])\b/g, (_m, v) => `4${v}`);
  out = out.replace(/(\d)[oO](\d)/g, "$10$2");
  out = out.replace(/(\d)[oO]([a-zA-Z])/g, "$10$2");
  out = out.replace(/(\d)[lI](\d)/g, "$11$2");
  out = out.replace(/\bI(\d)/g, "1$1");
  out = out.replace(/(?<=[\d+\-=(\s])z(?=[\d+\-=)\s])/g, "2");
  out = out.replace(/(?<=[\d+\-=(\s])Z(?=[\d+\-=)\s])/g, "2");
  out = out.replace(/(\d)B(\d)/g, "$18$2");
  out = out.replace(/(\d)G(\d)/g, "$16$2");
  return out;
}

function fixOperatorSpacing(s: string): string {
  let out = s;
  out = out.replace(/-{2,}/g, "-");
  out = out.replace(/([0-9a-zA-Z\)])\s*([+\-=])\s*(?=[0-9a-zA-Z\(])/g, "$1 $2 ");
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/(\d)\s+([a-zA-Z])\b/g, "$1$2");
  return out;
}

function reconstructEquationLines(s: string): string {
  const rawLines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of rawLines) {
    const startsWithOp = /^[+\-=]/.test(line);
    const prev = out[out.length - 1];
    if (prev && (startsWithOp || !/=/.test(prev))) {
      out[out.length - 1] = `${prev} ${line}`.replace(/\s+/g, " ").trim();
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

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
    const b1 = s; s = fixCharacterMisreads(s);
    if (s !== b1) notes.push("fixed character misreads");
    const b2 = s; s = fixOperatorSpacing(s);
    if (s !== b2) notes.push("normalized operator spacing");
    const b3 = s; s = reconstructEquationLines(s);
    if (s !== b3) notes.push("reconstructed wrapped lines");
  }
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
  return { cleaned: s, changed: s !== original, notes };
}
