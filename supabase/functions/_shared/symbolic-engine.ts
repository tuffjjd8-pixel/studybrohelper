/**
 * SymbolicEngine — lightweight CAS layer using nerdamer
 * Used to verify/refine LLM algebra in Deep Mode.
 */

let nerdamerLoaded = false;
let nerdamer: any;

async function ensureLoaded() {
  if (nerdamerLoaded) return;
  try {
    nerdamer = (await import("npm:nerdamer@1.1.14")).default;
    // Load extensions for solve, algebra, calculus
    await import("npm:nerdamer@1.1.14/Algebra.js");
    await import("npm:nerdamer@1.1.14/Calculus.js");
    await import("npm:nerdamer@1.1.14/Solve.js");
    nerdamerLoaded = true;
  } catch (e) {
    console.error("[SymbolicEngine] Failed to load nerdamer:", e);
    throw e;
  }
}

export async function factor(expr: string): Promise<string> {
  await ensureLoaded();
  return nerdamer(expr).factor().toString();
}

export async function simplify(expr: string): Promise<string> {
  await ensureLoaded();
  return nerdamer(expr).simplify().toString();
}

export async function expand(expr: string): Promise<string> {
  await ensureLoaded();
  return nerdamer(expr).expand().toString();
}

export async function solveEquation(expr: string, variable: string): Promise<string[]> {
  await ensureLoaded();
  const solutions = nerdamer.solve(expr, variable);
  return solutions.toString().split(",").map((s: string) => s.trim()).filter(Boolean);
}

/**
 * Determines if a question likely needs symbolic math verification.
 * Returns false for simple arithmetic, word problems, or non-algebra tasks.
 */
export function needsSymbolicVerification(question: string): boolean {
  const q = question.toLowerCase();
  
  // Skip simple arithmetic, word problems, essays, history, etc.
  const skipPatterns = [
    /^\d+\s*[\+\-\*\/]\s*\d+$/,        // pure arithmetic like "3+5"
    /what\s+(is|are|was|were)\b/,         // factual questions
    /write\s+(an?\s+)?essay/,             // writing tasks
    /explain\s+(the|how|why|what)/,       // explanation requests
    /\b(history|geography|biology|english|literature)\b/,
  ];
  
  if (skipPatterns.some(p => p.test(q))) return false;
  
  // Trigger for algebra/symbolic tasks
  const triggerPatterns = [
    /\bfactor/,
    /\bsimplif/,
    /\bexpand/,
    /\bsolve\b.*(?:for|equation)/,
    /\bfind\s+(?:the\s+)?(?:roots?|zeros?|solutions?)/,
    /\brationali[sz]e/,
    /\bpartial\s+fraction/,
    /x\^[2-9]/,                           // polynomial-like
    /\bquadratic/,
    /\bcubic/,
    /\bpolynomial/,
  ];
  
  return triggerPatterns.some(p => p.test(q));
}

/**
 * Run symbolic verification on a question. Returns a supplementary result
 * string or null if verification isn't applicable or fails.
 */
export async function verifySymbolic(question: string): Promise<string | null> {
  try {
    await ensureLoaded();
    
    // Extract expression — try to find something like "x^2 - 5x + 6" or "2x + 3 = 0"
    const exprMatch = question.match(/([a-z]\^?\d*[\s\+\-\*\/\(\)a-z\d\^\.]+(?:=\s*\d+)?)/i);
    if (!exprMatch) return null;
    
    let expr = exprMatch[1].trim();
    const q = question.toLowerCase();
    
    let result: string | null = null;
    
    if (q.includes("factor")) {
      result = `Symbolic verification: ${await factor(expr)}`;
    } else if (q.includes("simplif")) {
      result = `Symbolic verification: ${await simplify(expr)}`;
    } else if (q.includes("expand")) {
      result = `Symbolic verification: ${await expand(expr)}`;
    } else if (q.includes("solve") || q.includes("roots") || q.includes("zeros")) {
      // Handle equations: if has "= 0", strip it for nerdamer
      expr = expr.replace(/\s*=\s*0\s*$/, "");
      const variable = expr.match(/[a-z]/i)?.[0] || "x";
      const solutions = await solveEquation(expr, variable);
      if (solutions.length > 0) {
        result = `Symbolic verification: ${variable} = ${solutions.join(", ")}`;
      }
    } else {
      // Default: try to simplify
      result = `Symbolic verification: ${await simplify(expr)}`;
    }
    
    return result;
  } catch (e) {
    console.log("[SymbolicEngine] Verification failed (falling back to LLM-only):", e);
    return null;
  }
}
