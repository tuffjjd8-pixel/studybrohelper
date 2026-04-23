// Shared types and helpers for AI-returned visual payloads (graphs / tables).
// The edge function embeds an optional <visual>{...}</visual> JSON block at the
// end of the solution text. This module extracts and validates it.

export type GraphPayload = {
  type: "line" | "parabola" | "points";
  equation?: string;
  x_min?: number;
  x_max?: number;
  vertex?: [number, number];
  slope?: number;
  intercept?: number;
  points?: Array<[number, number]>;
};

export type TablePayload = {
  columns: string[];
  rows: string[][];
};

export type SolveVisual =
  | { visual_type: "graph"; visual_payload: GraphPayload }
  | { visual_type: "table"; visual_payload: TablePayload };

const VISUAL_RE = /<visual>([\s\S]*?)<\/visual>/i;

/** Remove the <visual>...</visual> block from text for clean display. */
export function stripVisualBlock(text: string): string {
  if (!text) return text;
  return text.replace(/<visual>[\s\S]*?<\/visual>/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Parse and validate a <visual>...</visual> block embedded in solution text. */
export function extractVisualFromText(text: string): SolveVisual | null {
  if (!text) return null;
  const m = text.match(VISUAL_RE);
  if (!m) return null;
  let raw = m[1].trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```$/g, "").trim();
  }
  try {
    const parsed = JSON.parse(raw);
    return validateVisual(parsed);
  } catch {
    return null;
  }
}

/** Validate an already-parsed visual object (e.g. coming directly from the edge function). */
export function validateVisual(parsed: unknown): SolveVisual | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const vt = p.visual_type;
  const vp = p.visual_payload as Record<string, unknown> | undefined;
  if (!vp || typeof vp !== "object") return null;

  if (vt === "table") {
    const columns = Array.isArray(vp.columns)
      ? (vp.columns as unknown[]).map((c) => String(c)).slice(0, 8)
      : null;
    const rows = Array.isArray(vp.rows)
      ? (vp.rows as unknown[])
          .filter((r) => Array.isArray(r))
          .slice(0, 20)
          .map((r) => (r as unknown[]).slice(0, 8).map((c) => (c == null ? "" : String(c))))
      : null;
    if (!columns || !rows || columns.length === 0) return null;
    return { visual_type: "table", visual_payload: { columns, rows } };
  }

  if (vt === "graph") {
    const type = vp.type;
    if (type !== "line" && type !== "parabola" && type !== "points") return null;
    const out: GraphPayload = { type };
    if (typeof vp.equation === "string") out.equation = String(vp.equation).slice(0, 200);
    if (typeof vp.x_min === "number" && Number.isFinite(vp.x_min)) out.x_min = vp.x_min;
    if (typeof vp.x_max === "number" && Number.isFinite(vp.x_max)) out.x_max = vp.x_max;
    if (typeof vp.slope === "number" && Number.isFinite(vp.slope)) out.slope = vp.slope;
    if (typeof vp.intercept === "number" && Number.isFinite(vp.intercept)) out.intercept = vp.intercept;
    if (
      Array.isArray(vp.vertex) &&
      vp.vertex.length === 2 &&
      typeof (vp.vertex as unknown[])[0] === "number" &&
      typeof (vp.vertex as unknown[])[1] === "number"
    ) {
      out.vertex = vp.vertex as [number, number];
    }
    if (Array.isArray(vp.points)) {
      const pts = (vp.points as unknown[])
        .filter(
          (p) =>
            Array.isArray(p) &&
            (p as unknown[]).length === 2 &&
            typeof (p as unknown[])[0] === "number" &&
            typeof (p as unknown[])[1] === "number" &&
            Number.isFinite((p as number[])[0]) &&
            Number.isFinite((p as number[])[1])
        )
        .slice(0, 200) as Array<[number, number]>;
      if (pts.length > 0) out.points = pts;
    }
    if (!out.equation && !out.points && !(typeof out.slope === "number" && typeof out.intercept === "number")) {
      return null;
    }
    return { visual_type: "graph", visual_payload: out };
  }

  return null;
}

/**
 * Safely evaluate a simple "y = f(x)" equation string for a numeric x.
 * Supports + - * / ^, parentheses, x, basic constants and Math.* functions.
 * Returns null on parse error or non-finite result.
 */
export function evalEquation(equation: string, x: number): number | null {
  if (!equation) return null;
  let expr = equation.trim();
  // Strip leading "y =" or "f(x) ="
  expr = expr.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, "");
  // Replace caret with **
  expr = expr.replace(/\^/g, "**");
  // Implicit multiplication: 2x -> 2*x, )( -> )*(, x( -> x*(
  expr = expr.replace(/(\d)\s*([a-zA-Z(])/g, "$1*$2");
  expr = expr.replace(/\)\s*\(/g, ")*(");
  expr = expr.replace(/([a-zA-Z0-9)])\s*\(/g, (m, c) => {
    // Don't break Math.func( or sin(, cos(, etc. Keep as-is when preceded by a letter chain followed by '('.
    if (/[a-zA-Z]/.test(c)) return `${c}(`;
    return `${c}*(`;
  });
  // Whitelist allowed characters (very loose validation)
  if (!/^[\sxX0-9+\-*/().,a-zA-Z]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", "Math", `"use strict"; return (${expr});`);
    const v = fn(x, Math);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
