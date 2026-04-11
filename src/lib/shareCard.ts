/**
 * Generates a branded share card image on a canvas.
 * Returns a data URL (PNG) ready for sharing/saving.
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const PADDING = 60;
const NEON_GREEN = "#39FF14";
const NEON_GREEN_DIM = "rgba(57, 255, 20, 0.15)";
const BG_COLOR = "#0a0a0f";
const BG_CARD = "#141420";
const TEXT_WHITE = "#f2f2f2";
const TEXT_MUTED = "#8a8a9a";

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + "…";
}

function extractFinalAnswer(solution: string): string | null {
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
  // Try to find numbered steps or bullet points
  const lines = solution.split("\n").filter(l => l.trim().length > 0);
  const stepLines = lines.filter(l => /^(\d+[\.\):]|\*|-|•|Step\s*\d)/i.test(l.trim()));
  
  const steps = (stepLines.length >= 2 ? stepLines : lines.filter(l => l.trim().length > 20))
    .slice(0, max)
    .map(s => s.trim()
      .replace(/^\d+[\.\):]\s*/, "")
      .replace(/^\*+\s*/, "")
      .replace(/^-\s*/, "")
      .replace(/^•\s*/, "")
      .replace(/^Step\s*\d+[:\s]*/i, "")
      .replace(/\*{1,2}/g, "")
      .trim()
    );

  return steps.map(s => truncate(s, 80));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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

export interface ShareCardData {
  question: string;
  solution: string;
  subject: string;
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const { question, solution, subject } = data;
  const finalAnswer = extractFinalAnswer(solution) || "See solution below";
  const steps = extractKeySteps(solution);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle glow circle in upper-right
  const gradient = ctx.createRadialGradient(CARD_WIDTH - 200, 150, 0, CARD_WIDTH - 200, 150, 400);
  gradient.addColorStop(0, "rgba(57, 255, 20, 0.08)");
  gradient.addColorStop(1, "rgba(57, 255, 20, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  let y = PADDING;

  // Subject pill
  ctx.font = "bold 24px 'Space Grotesk', system-ui, sans-serif";
  const subjectText = subject.charAt(0).toUpperCase() + subject.slice(1);
  const pillW = ctx.measureText(subjectText).width + 40;
  drawRoundedRect(ctx, PADDING, y, pillW, 44, 22);
  ctx.fillStyle = NEON_GREEN_DIM;
  ctx.fill();
  ctx.strokeStyle = "rgba(57, 255, 20, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = NEON_GREEN;
  ctx.fillText(subjectText, PADDING + 20, y + 30);
  y += 70;

  // "FINAL ANSWER" label
  ctx.font = "600 20px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = NEON_GREEN;
  ctx.fillText("✦  FINAL ANSWER", PADDING, y + 20);
  y += 40;

  // Final answer box
  const answerBoxX = PADDING;
  const answerBoxW = CARD_WIDTH - PADDING * 2;
  ctx.font = "bold 42px 'Space Grotesk', system-ui, sans-serif";
  const answerLines = wrapText(ctx, truncate(finalAnswer, 120), answerBoxW - 48);
  const answerBoxH = Math.max(100, answerLines.length * 52 + 40);

  // Glow behind answer box
  ctx.shadowColor = NEON_GREEN;
  ctx.shadowBlur = 30;
  drawRoundedRect(ctx, answerBoxX, y, answerBoxW, answerBoxH, 20);
  ctx.fillStyle = "rgba(57, 255, 20, 0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(57, 255, 20, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = NEON_GREEN;
  answerLines.forEach((line, i) => {
    ctx.fillText(line, answerBoxX + 24, y + 48 + i * 52);
  });
  y += answerBoxH + 40;

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(CARD_WIDTH - PADDING, y);
  ctx.stroke();
  y += 30;

  // Problem section
  ctx.font = "600 20px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText("PROBLEM", PADDING, y + 18);
  y += 40;

  ctx.font = "400 28px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = TEXT_WHITE;
  const questionLines = wrapText(ctx, truncate(question, 200), CARD_WIDTH - PADDING * 2);
  questionLines.forEach((line, i) => {
    ctx.fillText(line, PADDING, y + i * 38);
  });
  y += questionLines.length * 38 + 30;

  // Steps section
  if (steps.length > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(CARD_WIDTH - PADDING, y);
    ctx.stroke();
    y += 30;

    ctx.font = "600 20px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText("KEY STEPS", PADDING, y + 18);
    y += 45;

    steps.forEach((step, i) => {
      // Step number circle
      const circleX = PADDING + 16;
      const circleY = y + 2;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 16, 0, Math.PI * 2);
      ctx.fillStyle = NEON_GREEN_DIM;
      ctx.fill();
      ctx.font = "bold 18px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = NEON_GREEN;
      ctx.fillText(String(i + 1), circleX - 5, circleY + 6);

      // Step text
      ctx.font = "400 24px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillStyle = TEXT_WHITE;
      const stepLines = wrapText(ctx, step, CARD_WIDTH - PADDING * 2 - 50);
      stepLines.forEach((line, j) => {
        ctx.fillText(line, PADDING + 44, y + 8 + j * 32);
      });
      y += Math.max(40, stepLines.length * 32 + 16);
    });
  }

  // Footer branding — push to bottom
  const footerY = CARD_HEIGHT - 60;

  // Subtle divider
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.beginPath();
  ctx.moveTo(PADDING, footerY - 20);
  ctx.lineTo(CARD_WIDTH - PADDING, footerY - 20);
  ctx.stroke();

  // Logo dot
  ctx.beginPath();
  ctx.arc(PADDING + 8, footerY + 6, 8, 0, Math.PI * 2);
  ctx.fillStyle = NEON_GREEN;
  ctx.fill();

  ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = TEXT_WHITE;
  ctx.fillText("StudyBro", PADDING + 26, footerY + 14);

  ctx.font = "400 20px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText("AI Homework Solver", PADDING + 160, footerY + 14);

  // Watermark URL on far right
  ctx.font = "400 18px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = "rgba(57, 255, 20, 0.4)";
  const urlText = "studybrohelper.lovable.app";
  const urlW = ctx.measureText(urlText).width;
  ctx.fillText(urlText, CARD_WIDTH - PADDING - urlW, footerY + 14);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/png",
      1.0
    );
  });
}
