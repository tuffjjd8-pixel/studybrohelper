/**
 * Preprocess math content so remark-math can parse it.
 *
 * 1. Clean up artifacts from backend LaTeX generation (doubled delimiters,
 *    empty blocks, double-escaped commands like \f\frac).
 * 2. Convert \[...\] → $$...$$ and \(...\) → $...$
 *    (remark-math only supports $ delimiters).
 */
export function preprocessMath(content: string): string {
  let result = content;

  // ── Fix double-escaped command artifacts ──
  // Backend may produce \f\frac instead of \frac, etc.
  result = result.replace(/\\f\\frac/g, "\\frac");
  result = result.replace(/\\t\\theta/g, "\\theta");
  result = result.replace(/\\t\\times/g, "\\times");
  result = result.replace(/\\t\\to/g, "\\to");
  result = result.replace(/\\t\\tau/g, "\\tau");
  result = result.replace(/\\t\\tan/g, "\\tan");
  result = result.replace(/\\r\\right/g, "\\right");
  result = result.replace(/\\r\\rho/g, "\\rho");
  result = result.replace(/\\b\\beta/g, "\\beta");
  result = result.replace(/\\b\\bar/g, "\\bar");
  result = result.replace(/\\b\\binom/g, "\\binom");
  result = result.replace(/\\b\\boxed/g, "\\boxed");
  result = result.replace(/\\n\\nabla/g, "\\nabla");
  result = result.replace(/\\n\\nu/g, "\\nu");
  result = result.replace(/\\n\\neq/g, "\\neq");

  // ── Remove empty delimiter blocks ──
  result = result.replace(/\\\(\s*\\\)/g, "");
  result = result.replace(/\\\[\s*\\\]/g, "");

  // ── Fix doubled delimiters like \(\( → \( ──
  result = result.replace(/\\\(\\\(/g, "\\(");
  result = result.replace(/\\\)\\\)/g, "\\)");
  result = result.replace(/\\\[\\\[/g, "\\[");
  result = result.replace(/\\\]\\\]/g, "\\]");

  // ── Convert \[...\] display math to $$...$$ ──
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => {
    return `$$${inner}$$`;
  });

  // ── Convert \(...\) inline math to $...$ ──
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => {
    return `$${inner}$`;
  });

  return result;
}
