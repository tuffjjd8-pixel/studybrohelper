/**
 * Generates a premium branded share card image on a canvas.
 * Returns a PNG Blob ready for sharing/saving.
 */

const CARD_W = 1080;
const CARD_H = 1920; // 9:16 ratio — fits stories/reels
const PAD = 72;
const CONTENT_W = CARD_W - PAD * 2;

const GREEN = "#00FF88";
const GREEN_DIM = "rgba(0, 255, 136, 0.12)";
const GREEN_GLOW = "rgba(0, 255, 136, 0.06)";
const BG = "#0B0B0B";
const WHITE = "#F0F0F0";
const MUTED = "#555566";
const DIVIDER = "rgba(255,255,255,0.05)";

// ─── Helpers ───────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 99): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      if (lines.length >= maxLines) { lines[lines.length - 1] += "…"; return lines; }
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawDivider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = DIVIDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(CARD_W - PAD, y);
  ctx.stroke();
}

// ─── Content extraction ────────────────────────────────

export function extractFinalAnswer(solution: string): string | null {
  const patterns = [
    /(?:final\s*answer|the\s*answer\s*is)[:\s]*\*{0,2}(.+?)(?:\*{0,2})(?:\n|$)/i,
    /\\boxed\{(.+?)\}/,
    /\*\*Answer:\*\*\s*(.+?)(?:\n|$)/i,
    /(?:therefore|thus|hence)[,:]?\s*(?:the\s*(?:answer|result|solution)\s*is\s*)?(.+?)(?:\.|$)/im,
    /=\s*\*{0,2}(.+?)\*{0,2}\s*$/m,
  ];
  for (const p of patterns) {
    const m = solution.match(p);
    if (m?.[1]) {
      const a = m[1].trim().replace(/\*{1,2}/g, "").replace(/\\$/, "").trim();
      if (a.length > 0 && a.length < 200) return a;
    }
  }
  return null;
}

function extractKeySteps(solution: string, max = 3): string[] {
  const lines = solution.split("\n").filter(l => l.trim().length > 0);
  const stepLines = lines.filter(l => /^(\d+[\.\):]|\*|-|•|Step\s*\d)/i.test(l.trim()));
  const source = stepLines.length >= 2 ? stepLines : lines.filter(l => l.trim().length > 15);
  return source
    .slice(0, max)
    .map(s =>
      s.trim()
        .replace(/^\d+[\.\):]\s*/, "")
        .replace(/^\*+\s*/, "")
        .replace(/^[-•]\s*/, "")
        .replace(/^Step\s*\d+[:\s]*/i, "")
        .replace(/\*{1,2}/g, "")
        .trim()
    )
    .filter(Boolean)
    .map(s => truncate(s, 70));
}

// ─── Main renderer ─────────────────────────────────────

export interface ShareCardData {
  question: string;
  solution: string;
  subject: string;
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const { question, solution, subject } = data;
  const finalAnswer = extractFinalAnswer(solution) || "See full solution";
  const steps = extractKeySteps(solution);
  const FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Very subtle top-right glow
  const glow = ctx.createRadialGradient(CARD_W - 100, 200, 0, CARD_W - 100, 200, 500);
  glow.addColorStop(0, "rgba(0, 255, 136, 0.04)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  let y = PAD + 20;

  // ── Subject pill ──
  ctx.font = `500 22px ${FONT}`;
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
  const pillTextW = ctx.measureText(subjectLabel).width;
  const pillW = pillTextW + 36;
  roundRect(ctx, PAD, y, pillW, 38, 19);
  ctx.fillStyle = GREEN_DIM;
  ctx.fill();
  ctx.fillStyle = GREEN;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(subjectLabel, PAD + 18, y + 26);
  y += 80;

  // ── Final Answer label ──
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.letterSpacing = "3px";
  ctx.fillText("FINAL ANSWER", PAD, y);
  y += 36;

  // ── Final Answer ──
  ctx.font = `700 48px ${FONT}`;
  ctx.fillStyle = GREEN;
  const answerLines = wrapText(ctx, truncate(finalAnswer, 100), CONTENT_W, 3);
  answerLines.forEach((line, i) => {
    ctx.fillText(line, PAD, y + i * 62);
  });
  y += answerLines.length * 62 + 16;

  // Thin green accent line under answer
  ctx.fillStyle = GREEN;
  roundRect(ctx, PAD, y, 60, 3, 1.5);
  ctx.fill();
  y += 50;

  // ── Divider ──
  drawDivider(ctx, y);
  y += 40;

  // ── Problem ──
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("PROBLEM", PAD, y);
  y += 36;

  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = WHITE;
  const qLines = wrapText(ctx, truncate(question, 180), CONTENT_W, 4);
  qLines.forEach((line, i) => {
    ctx.fillText(line, PAD, y + i * 42);
  });
  y += qLines.length * 42 + 40;

  // ── Divider ──
  drawDivider(ctx, y);
  y += 40;

  // ── Key Steps ──
  if (steps.length > 0) {
    ctx.font = `500 18px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText("KEY STEPS", PAD, y);
    y += 44;

    steps.forEach((step, i) => {
      // Step number
      const numX = PAD;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillStyle = GREEN;
      ctx.fillText(`${i + 1}`, numX, y + 4);

      // Step text
      const textX = PAD + 32;
      ctx.font = `400 26px ${FONT}`;
      ctx.fillStyle = "rgba(240,240,240,0.85)";
      const sLines = wrapText(ctx, step, CONTENT_W - 32, 2);
      sLines.forEach((line, j) => {
        ctx.fillText(line, textX, y + 4 + j * 36);
      });
      y += Math.max(44, sLines.length * 36 + 20);
    });
  }

  // ── Footer — always at bottom ──
  const footerY = CARD_H - PAD - 10;

  // Thin divider
  drawDivider(ctx, footerY - 30);

  // Green dot
  ctx.beginPath();
  ctx.arc(PAD + 7, footerY + 4, 7, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();

  // Brand name
  ctx.font = `700 24px ${FONT}`;
  ctx.fillStyle = "rgba(240,240,240,0.6)";
  ctx.fillText("StudyBro", PAD + 24, footerY + 12);

  // Tagline
  ctx.font = `400 18px ${FONT}`;
  ctx.fillStyle = "rgba(240,240,240,0.25)";
  ctx.fillText("AI Homework Solver", PAD + 148, footerY + 12);

  // URL right-aligned
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = "rgba(0, 255, 136, 0.25)";
  const urlText = "studybrohelper.lovable.app";
  const urlW = ctx.measureText(urlText).width;
  ctx.fillText(urlText, CARD_W - PAD - urlW, footerY + 12);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      1.0
    );
  });
}
