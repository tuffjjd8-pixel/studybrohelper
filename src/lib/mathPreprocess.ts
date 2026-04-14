/**
 * Preprocess math content so remark-math can parse it.
 *
 * 1. Restore control characters corrupted by JSON parsing
 *    (\f → form-feed, \t → tab, etc.) back to proper LaTeX.
 * 2. Clean doubled delimiters and empty blocks.
 * 3. Convert \[...\] → $$...$$ and \(...\) → $...$
 *    (remark-math only supports $ delimiters).
 */
/**
 * Returns true when the text looks like it contains actual math expressions
 * (LaTeX delimiters, math operators, symbols, etc.).
 */
function containsMath(text: string): boolean {
  // Explicit LaTeX delimiters
  if (/\\\(|\\\)|\\\[|\\]|\$\$|\$[^$]/.test(text)) return true;
  // Common LaTeX commands
  if (/\\(frac|sqrt|sum|int|prod|lim|infty|alpha|beta|theta|omega|hbar|nabla|partial|vec|hat|bar|dot)/.test(text)) return true;
  // Math-heavy symbols that rarely appear in prose
  if (/[∫∑∏√≈≠≤≥±∓∞∂∇]/.test(text)) return true;
  // Superscripts / subscripts patterns like x^2, a_n
  if (/[a-zA-Z]\^[\d{]/.test(text) || /[a-zA-Z]_[\d{a-zA-Z]/.test(text)) return true;
  return false;
}

export function preprocessMath(content: string): string {
  // If the content has no math at all, return it untouched — preserves
  // plain-text paragraphs for non-math subjects.
  if (!containsMath(content)) return content;

  let result = content;

  // ── Step 1: Restore control characters to backslash + letter ──
  // JSON.parse can turn LaTeX commands into control chars:
  //   \frac → form-feed (0x0C) + "rac"
  //   \theta → tab (0x09) + "heta"
  //   \right → carriage-return (0x0D) + "ight"
  //   \beta → backspace (0x08) + "eta"
  // Restore them to the proper LaTeX backslash commands.
  result = result.replace(/\f/g, "\\f");       // form-feed → \f
  result = result.replace(/\t/g, "\\t");       // tab → \t (note: tabs in normal text are rare in math)
  result = result.replace(/\r/g, "\\r");       // carriage return → \r
  result = result.replace(/\x08/g, "\\b");     // backspace → \b
  // Only restore \n→\\n when immediately followed by a known LaTeX command stem
  // (e.g. \nabla, \nu, \neq) — never for normal prose newlines.
  result = result.replace(/\n(?=abla|u[^a-z]|eq\b)/g, "\\n");

  // ── Step 2: Fix doubled command prefixes ──
  const doubles: [string, string][] = [
    ["\\f\\frac", "\\frac"],
    ["\\f\\flat", "\\flat"],
    ["\\f\\forall", "\\forall"],
    ["\\t\\theta", "\\theta"],
    ["\\t\\times", "\\times"],
    ["\\t\\tan", "\\tan"],
    ["\\t\\tau", "\\tau"],
    ["\\t\\text", "\\text"],
    ["\\r\\right", "\\right"],
    ["\\r\\rho", "\\rho"],
    ["\\r\\rangle", "\\rangle"],
    ["\\b\\beta", "\\beta"],
    ["\\b\\bar", "\\bar"],
    ["\\b\\binom", "\\binom"],
    ["\\b\\boxed", "\\boxed"],
    ["\\b\\braket", "\\braket"],
    ["\\b\\bra", "\\bra"],
    ["\\n\\nabla", "\\nabla"],
    ["\\n\\nu", "\\nu"],
    ["\\n\\neq", "\\neq"],
    ["\\n\\newcommand", "\\newcommand"],
  ];
  for (const [from, to] of doubles) {
    while (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }

  // Handle \to separately (short command)
  while (result.includes("\\t\\to")) {
    result = result.split("\\t\\to").join("\\to");
  }

  // ── Step 3: Remove empty delimiter blocks ──
  result = result.split("\\(\\)").join("");
  result = result.split("\\[\\]").join("");

  // ── Step 4: Fix doubled delimiters: \(\( → \( ──
  result = result.split("\\(\\(").join("\\(");
  result = result.split("\\)\\)").join("\\)");
  result = result.split("\\[\\[").join("\\[");
  result = result.split("\\]\\]").join("\\]");

  // ── Step 5: Convert \[...\] display math to $$...$$ ──
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => {
    return `$$${inner}$$`;
  });

  // ── Step 6: Convert \(...\) inline math to $...$ ──
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => {
    return `$${inner}$`;
  });

  return result;
}
