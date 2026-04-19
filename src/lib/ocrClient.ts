/**
 * Direct OCR client.
 * - Compresses images aggressively (max 1024px, JPEG q≈0.65, target 150-300KB).
 * - Uploads via HTTPS proxy as multipart/form-data.
 * - Returns extracted text + per-stage timings.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const OCR_URL = `${SUPABASE_URL}/functions/v1/ocr-proxy`;

export type OcrMode = "text" | "table" | "solve_free" | "solve_pro" | "solve_quiz";

const MAX_DIM = 1024;
const TARGET_MIN_BYTES = 150 * 1024;
const TARGET_MAX_BYTES = 300 * 1024;
const QUALITY_STEPS = [0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4];

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function inputToImageBitmap(input: File | Blob | string): Promise<ImageBitmap> {
  let blob: Blob;
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      blob = dataUrlToBlob(input);
    } else {
      const res = await fetch(input);
      blob = await res.blob();
    }
  } else if (input instanceof File || input instanceof Blob) {
    blob = input;
  } else {
    throw new Error("Unsupported image input");
  }
  return await createImageBitmap(blob, { imageOrientation: "from-image" } as any);
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    )
  );
}

/** Compress to ≤1024px longest edge, target 150–300KB JPEG. */
export async function compressForOcr(input: File | Blob | string): Promise<Blob> {
  const bitmap = await inputToImageBitmap(input);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  let bestBlob: Blob | null = null;
  for (const q of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, q);
    bestBlob = blob;
    if (blob.size <= TARGET_MAX_BYTES) {
      if (blob.size >= TARGET_MIN_BYTES || q <= 0.5) break;
      return blob;
    }
  }
  return bestBlob || (await canvasToBlob(canvas, 0.6));
}

export interface OcrResult {
  text: string;
  raw: any;
  /** Time spent compressing on client (ms). */
  compress_ms?: number;
  /** Total round-trip from POST send to response received (ms). */
  network_ms?: number;
  /** Proxy total time (header). */
  proxy_ms?: number;
  /** Upstream OCR-server time only (header). */
  upstream_ms?: number;
  /** Compressed payload size in KB. */
  size_kb?: number;
}

export async function uploadImageForOcr(
  input: File | Blob | string,
  mode: OcrMode = "text",
  filename = "upload.jpg"
): Promise<OcrResult> {
  const t_start = performance.now();
  const blob = await compressForOcr(input);
  const t_compressed = performance.now();
  const file = new File([blob], filename, { type: "image/jpeg" });

  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);

  const t_send = performance.now();
  const res = await fetch(OCR_URL, { method: "POST", body: form });
  const t_recv = performance.now();

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `OCR failed (${res.status})`);
  }

  const json: any = await res.json().catch(() => ({}));
  let text =
    json.text ??
    json.extracted_text ??
    json.ocr_text ??
    json.result?.text ??
    json.data?.text ??
    "";
  // text-mode returns results: [{text, confidence, box}]
  if (!text && Array.isArray(json.results)) {
    text = json.results.map((r: any) => r?.text ?? "").filter(Boolean).join("\n");
  }

  // ── Cleanup & normalization layer ──
  const rawText = String(text || "").trim();
  const { cleanupOcrMath } = await import("@/lib/ocrCleanup");
  const { cleaned, changed, notes } = cleanupOcrMath(rawText);
  if (changed) {
    console.log("[OCR] cleanup applied", { notes, before: rawText, after: cleaned });
  }
  text = cleaned;

  const compress_ms = Math.round(t_compressed - t_start);
  const network_ms = Math.round(t_recv - t_send);
  const proxy_ms = Number(res.headers.get("x-proxy-ms")) || undefined;
  const upstream_ms = Number(res.headers.get("x-upstream-ms")) || undefined;
  const size_kb = Math.round(blob.size / 1024);

  console.log("[OCR] timings", {
    mode,
    size_kb,
    compress_ms,
    network_ms,
    proxy_ms,
    upstream_ms,
    server_ocr_ms: json.ocr_ms,
  });

  return {
    text: String(text || "").trim(),
    raw: json,
    compress_ms,
    network_ms,
    proxy_ms,
    upstream_ms,
    size_kb,
  };
}
