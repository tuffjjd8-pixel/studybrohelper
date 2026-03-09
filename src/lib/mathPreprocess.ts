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
  const BS = "\\"; // literal backslash

  // ── Fix double-escaped command artifacts ──
  // Backend may produce \f\frac instead of \frac, etc.
  const doubles: [string, string][] = [
    [BS+"f"+BS+"frac", BS+"frac"],
    [BS+"f"+BS+"flat", BS+"flat"],
    [BS+"f"+BS+"forall", BS+"forall"],
    [BS+"t"+BS+"theta", BS+"theta"],
    [BS+"t"+BS+"times", BS+"times"],
    [BS+"t"+BS+"tan", BS+"tan"],
    [BS+"t"+BS+"tau", BS+"tau"],
    [BS+"r"+BS+"right", BS+"right"],
    [BS+"r"+BS+"rho", BS+"rho"],
    [BS+"r"+BS+"rangle", BS+"rangle"],
    [BS+"b"+BS+"beta", BS+"beta"],
    [BS+"b"+BS+"bar", BS+"bar"],
    [BS+"b"+BS+"binom", BS+"binom"],
    [BS+"b"+BS+"boxed", BS+"boxed"],
    [BS+"n"+BS+"nabla", BS+"nabla"],
    [BS+"n"+BS+"nu", BS+"nu"],
    [BS+"n"+BS+"neq", BS+"neq"],
  ];
  for (const [from, to] of doubles) {
    while (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }

  // Handle \to separately
  result = result.split(BS+"t"+BS+"to ").join(BS+"to ");
  result = result.split(BS+"t"+BS+"to"+BS).join(BS+"to"+BS);

  // ── Remove empty delimiter blocks ──
  result = result.split(BS+"("+BS+")").join("");
  result = result.split(BS+"["+BS+"]").join("");

  // ── Fix doubled delimiters: \(\( → \( ──
  result = result.split(BS+"("+BS+"(").join(BS+"(");
  result = result.split(BS+")"+BS+")").join(BS+")");
  result = result.split(BS+"["+BS+"[").join(BS+"[");
  result = result.split(BS+"]"+BS+"]").join(BS+"]");

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
