/**
 * Generates a compact preview card for sharing.
 * Shows question + truncated solution with a fade-out and CTA.
 * Returns a PNG Blob.
 */

const CARD_W = 1080;
const MAX_CONTENT_H = 1200;
const PAD = 72;
const CONTENT_W = CARD_W - PAD * 2;

const GREEN = "#00FF88";
const GREEN_DIM = "rgba(0, 255, 136, 0.10)";
const BG = "#0B0B0B";
const WHITE = "#F0F0F0";
const MUTED = "#888899";
const DIVIDER = "rgba(255,255,255,0.06)";

const FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

// ─── Helpers ───────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines = 99
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      if (lines.length >= maxLines) {
        lines[lines.length - 1] += "…";
        return lines;
      }
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Strip markdown/LaTeX to plain text for canvas rendering.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\\\[[\s\S]*?\\\]/g, "[equation]")
    .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
    .replace(/\\\([\s\S]*?\\\)/g, "[math]")
    .replace(/\$[^$]+\$/g, "[math]")
    .replace(/\\boxed\{[^}]*\}/g, "[answer]")
    .replace(/\*{1,2}(.*?)\*{1,2}/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/^[-*•]\s*/gm, "• ")
    .replace(/^\d+[.)]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract the first ~30% of solution lines.
 */
function getPreviewContent(solution: string, ratio = 0.30): string {
  const lines = solution.split("\n");
  const cutoff = Math.max(4, Math.ceil(lines.length * ratio));
  return lines.slice(0, cutoff).join("\n");
}

/**
 * Extract a short final answer string (plain text, no LaTeX).
 */
function extractShortAnswer(solution: string): string | null {
  // boxed
  const boxed = solution.match(/\\boxed\{([^}]+)\}/);
  if (boxed?.[1]) {
    const inner = boxed[1].replace(/[\\{}]/g, "").trim();
    if (inner.length > 0 && inner.length < 80) return inner;
  }
  // "final answer" pattern
  const fa = solution.match(
    /(?:final\s*answer|the\s*answer\s*is)[:\s]*\*{0,2}([^\n*]+)/i
  );
  if (fa?.[1]) {
    const a = fa[1].replace(/\*+/g, "").trim();
    if (a.length > 0 && a.length < 120) return a;
  }
  // simple = result
  const eq = solution.match(/=\s*([0-9][0-9,.\s]*)\s*$/m);
  if (eq?.[1] && eq[1].trim().length < 40) return eq[1].trim();
  return null;
}

// ─── Main renderer ─────────────────────────────────────

export interface SharePreviewData {
  question: string;
  solution: string;
  subject: string;
}

export async function generateSharePreview(
  data: SharePreviewData
): Promise<Blob> {
  const { question, solution, subject } = data;
  const answer = extractShortAnswer(solution);
  const previewText = stripMarkdown(getPreviewContent(solution));

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  // We'll measure then trim height
  canvas.height = 2400; // temp large
  const ctx = canvas.getContext("2d")!;

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, 2400);

  // Subtle top-right glow
  const glow = ctx.createRadialGradient(CARD_W - 100, 150, 0, CARD_W - 100, 150, 450);
  glow.addColorStop(0, "rgba(0, 255, 136, 0.035)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, 2400);

  let y = PAD;

  // ── Subject pill ──
  ctx.font = `600 22px ${FONT}`;
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
  const pillTextW = ctx.measureText(subjectLabel).width;
  const pillW = pillTextW + 40;
  roundRect(ctx, PAD, y, pillW, 40, 20);
  ctx.fillStyle = GREEN_DIM;
  ctx.fill();
  ctx.fillStyle = GREEN;
  ctx.fillText(subjectLabel, PAD + 20, y + 28);
  y += 72;

  // ── Question ──
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("QUESTION", PAD, y);
  y += 34;

  ctx.font = `400 28px ${FONT}`;
  ctx.fillStyle = WHITE;
  const qLines = wrapText(ctx, truncate(question, 160), CONTENT_W, 3);
  qLines.forEach((line, i) => {
    ctx.fillText(line, PAD, y + i * 40);
  });
  y += qLines.length * 40 + 32;

  // ── Divider ──
  ctx.strokeStyle = DIVIDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(CARD_W - PAD, y);
  ctx.stroke();
  y += 32;

  // ── Answer highlight (if found) ──
  if (answer) {
    roundRect(ctx, PAD, y, CONTENT_W, 64, 16);
    ctx.fillStyle = "rgba(0, 255, 136, 0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 255, 136, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = GREEN;
    const aText = truncate(answer, 50);
    ctx.fillText(aText, PAD + 24, y + 42);
    y += 96;
  }

  // ── Solution preview ──
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = "rgba(240, 240, 240, 0.8)";
  const solutionLines = wrapText(ctx, previewText, CONTENT_W, 14);
  const lineH = 36;
  const solutionStartY = y;
  solutionLines.forEach((line, i) => {
    ctx.fillText(line, PAD, y + i * lineH);
  });
  y += solutionLines.length * lineH;

  // ── Fade gradient at bottom of solution ──
  const fadeH = 120;
  const fadeStartY = Math.max(solutionStartY, y - fadeH);
  const fade = ctx.createLinearGradient(0, fadeStartY, 0, y + 20);
  fade.addColorStop(0, "rgba(11, 11, 11, 0)");
  fade.addColorStop(0.6, "rgba(11, 11, 11, 0.7)");
  fade.addColorStop(1, BG);
  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeStartY, CARD_W, y - fadeStartY + 20);
  y += 24;

  // ── CTA ──
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = GREEN;
  const ctaText = "Tap to see full solution →";
  const ctaW = ctx.measureText(ctaText).width;
  ctx.fillText(ctaText, (CARD_W - ctaW) / 2, y + 6);
  y += 60;

  // ── Footer divider ──
  ctx.strokeStyle = DIVIDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(CARD_W - PAD, y);
  ctx.stroke();
  y += 28;

  // ── Footer branding ──
  ctx.beginPath();
  ctx.arc(PAD + 7, y + 4, 7, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();

  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = "rgba(240,240,240,0.5)";
  ctx.fillText("StudyBro", PAD + 24, y + 11);

  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = "rgba(240,240,240,0.2)";
  ctx.fillText("AI Homework Solver", PAD + 140, y + 11);

  const urlText = "studybrohelper.lovable.app";
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = "rgba(0, 255, 136, 0.25)";
  const urlW = ctx.measureText(urlText).width;
  ctx.fillText(urlText, CARD_W - PAD - urlW, y + 11);

  y += PAD;

  // ── Crop canvas to actual content height ──
  const finalH = Math.min(y, MAX_CONTENT_H + PAD * 2);
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = CARD_W;
  finalCanvas.height = finalH;
  const fCtx = finalCanvas.getContext("2d")!;
  fCtx.drawImage(canvas, 0, 0, CARD_W, finalH, 0, 0, CARD_W, finalH);

  return new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      1.0
    );
  });
}
