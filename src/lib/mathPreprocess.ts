/**
 * Preprocess math content so remark-math can parse it.
 *
 * 1. Restore control characters corrupted by JSON parsing
 *    (\f → form-feed, \t → tab, etc.) back to proper LaTeX.
 * 2. Clean doubled delimiters and empty blocks.
 * 3. Convert \[...\] → $$...$$ and \(...\) → $...$
 *    (remark-math only supports $ delimiters).
 */
export function preprocessMath(content: string): string {
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
  // Don't replace ALL \n (newlines are meaningful), only before letters
  result = result.replace(/\n(?=[a-zA-Z])/g, "\\n");

  // ── Step 2: Fix doubled command prefixes ──
  // After step 1, \\f\\frac in JSON becomes \f\frac in the string.
  // Collapse these duplicates.
  const doubles: [string, string][] = [
    ["\\f\\frac", "\\frac"],
    ["\\f\\flat", "\\flat"],
    ["\\f\\forall", "\\forall"],
    ["\\t\\theta", "\\theta"],
    ["\\t\\times", "\\times"],
    ["\\t\\tan", "\\tan"],
    ["\\t\\tau", "\\tau"],
    ["\\r\\right", "\\right"],
    ["\\r\\rho", "\\rho"],
    ["\\r\\rangle", "\\rangle"],
    ["\\b\\beta", "\\beta"],
    ["\\b\\bar", "\\bar"],
    ["\\b\\binom", "\\binom"],
    ["\\b\\boxed", "\\boxed"],
    ["\\n\\nabla", "\\nabla"],
    ["\\n\\nu", "\\nu"],
    ["\\n\\neq", "\\neq"],
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
