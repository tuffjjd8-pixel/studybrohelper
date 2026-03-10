// ============================================================
// Shared LaTeX utilities for edge functions
// ============================================================

export function fixLatexDelimiters(text: string): string {
  let result = text;
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => `\\[${inner.trim()}\\]`);
  result = result.replace(/(?<!\$)(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_m, inner) => `\\(${inner}\\)`);
  return result;
}

export function fixCommonLatexErrors(content: string): string {
  if (typeof content !== "string") return content;

  const protectedWords: [RegExp, string][] = [
    [/Schr[\\()\s]*ö[\\()\s]*dinger/gi, "Schrödinger"],
    [/Schr[\\()\s]*o[\\()\s]*dinger/gi, "Schrödinger"],
  ];

  let result = content;
  for (const [pattern, replacement] of protectedWords) {
    result = result.replace(pattern, replacement);
  }
  const BS = "\\";

  result = result.split("\f").join(BS + "f");
  result = result.split("\t").join(BS + "t");
  result = result.split("\r").join(BS + "r");
  result = result.split("\b").join(BS + "b");
  result = result.replace(/\n(?=[A-Za-z])/g, BS + "n");

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
    [BS+"b"+BS+"bullet", BS+"bullet"],
    [BS+"n"+BS+"nabla", BS+"nabla"],
    [BS+"n"+BS+"nu", BS+"nu"],
    [BS+"n"+BS+"neq", BS+"neq"],
    [BS+"n"+BS+"neg", BS+"neg"],
    [BS+"n"+BS+"not", BS+"not"],
  ];
  for (const [from, to] of doubles) {
    while (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }

  result = result.split(BS+"t"+BS+"to ").join(BS+"to ");
  result = result.split(BS+"t"+BS+"to"+BS).join(BS+"to"+BS);

  result = result.split(BS+"("+BS+")").join("");
  result = result.split(BS+"["+BS+"]").join("");

  result = result.split(BS+"("+BS+"(").join(BS+"(");
  result = result.split(BS+")"+BS+")").join(BS+")");
  result = result.split(BS+"["+BS+"[").join(BS+"[");
  result = result.split(BS+"]"+BS+"]").join(BS+"]");

  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => BS+"["+inner.trim()+BS+"]");
  result = result.replace(/(?<!\$)(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_m, inner) => BS+"("+inner+BS+")");

  return result;
}

export function fixLatexInJSON(raw: string): string {
  return (
    raw
      .replace(/\x0c(?=[A-Za-z])/g, "\\\\f")
      .replace(/\x09(?=[A-Za-z])/g, "\\\\t")
      .replace(/\x0d(?=[A-Za-z])/g, "\\\\r")
      .replace(/\x08(?=[A-Za-z])/g, "\\\\b")
      .replace(/\n(?=[A-Za-z])/g, "\\\\n")
      .replace(/\\([bfnrt])(?=[A-Za-z])/g, "\\\\$1")
      .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
      .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
  );
}
