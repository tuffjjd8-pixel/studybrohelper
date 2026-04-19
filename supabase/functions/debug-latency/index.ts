// ============================================================
// 🚧 TEMPORARY DEBUG ROUTE — debug-latency
// Measures real per-stage latency for the StudyBro Groq pipeline.
// SAFE: does NOT affect production solve-homework logic.
// To remove later: delete this folder + remove [functions.debug-latency]
// from supabase/config.toml.
// ============================================================
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGroqWithRotation } from "../_shared/groq-key-manager.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FREE_TEXT_MODEL = "openai/gpt-oss-20b";
const PRO_TEXT_MODEL = "openai/gpt-oss-120b";

function now() {
  return performance.now();
}

// Rough token estimator (~4 chars/token)
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Decode base64 → bytes (also gives us size)
function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Read PNG/JPEG/WebP dimensions from raw bytes (best-effort, no deps)
function readImageDimensions(bytes: Uint8Array): { w: number; h: number } {
  try {
    // PNG: 8-byte sig, then IHDR at offset 16: width(4) height(4) big-endian
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { w: dv.getUint32(16), h: dv.getUint32(20) };
    }
    // JPEG: scan for SOF marker (0xFFC0..0xFFCF except C4,C8,CC)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i < bytes.length) {
        if (bytes[i] !== 0xff) { i++; continue; }
        const marker = bytes[i + 1];
        const len = (bytes[i + 2] << 8) | bytes[i + 3];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const w = (bytes[i + 7] << 8) | bytes[i + 8];
          return { w, h };
        }
        i += 2 + len;
      }
    }
    // WebP VP8/VP8L/VP8X
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      // VP8X chunk at offset 12
      if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
        const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
        return { w, h };
      }
    }
  } catch (_) { /* ignore */ }
  return { w: 0, h: 0 };
}

interface DebugBody {
  image: string; // data URL or raw base64
  mimeType?: string;
  isPremium?: boolean;
  ocrLang?: string;
}

async function callGroqVision(b64: string, mimeType: string): Promise<string> {
  const r = await callGroqWithRotation("https://api.groq.com/openai/v1/chat/completions", {
    model: GROQ_VISION_MODEL,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Describe this image in detail. Include any text, equations, numbers, labels, diagrams. Output ONLY the description, no solving." },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
      ],
    }],
    temperature: 0.2,
    max_tokens: 2048,
  });
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callPaddleOCR(bytes: Uint8Array, mimeType: string, mode: string): Promise<string> {
  const ext = mimeType.split("/")[1] || "png";
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: mimeType }), `image.${ext}`);
  fd.append("mode", mode);
  const r = await fetch("http://46.224.199.130:8000/ocr", { method: "POST", body: fd });
  if (!r.ok) throw new Error(`OCR ${r.status}`);
  const data = await r.json();
  return (data.text || data.extracted_text || data.result || "").trim();
}

async function probeHealth(): Promise<{ ok: boolean; status: number; body: string; ms: number }> {
  const t = now();
  try {
    const r = await fetch("http://46.224.199.130:8000/health", { method: "GET" });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body: body.slice(0, 200), ms: +(now() - t).toFixed(1) };
  } catch (e) {
    return { ok: false, status: 0, body: String(e), ms: +(now() - t).toFixed(1) };
  }
}

async function callGroqText(prompt: string, isPremium: boolean): Promise<string> {
  const model = isPremium ? PRO_TEXT_MODEL : FREE_TEXT_MODEL;
  const r = await callGroqWithRotation("https://api.groq.com/openai/v1/chat/completions", {
    model,
    messages: [
      { role: "system", content: "You are StudyBro, a homework solver. Solve clearly and concisely." },
      { role: "user", content: prompt },
    ],
    temperature: isPremium ? 0.5 : 0.7,
    max_tokens: 2048,
  });
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t_start = now();
  try {
    const body = (await req.json().catch(() => ({}))) as DebugBody & { mode?: string; healthOnly?: boolean };

    // Always probe /health first
    const health = await probeHealth();

    if (body?.healthOnly || !body?.image) {
      return new Response(JSON.stringify({ health, note: body?.image ? undefined : "image required for full run" }, null, 2), {
        status: body?.image ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Stage 1: preprocessing (parse data URL, decode, measure) ──
    const t_pre_start = now();
    let mimeType = body.mimeType || "image/png";
    let b64 = body.image;
    if (b64.startsWith("data:")) {
      const m = b64.match(/^data:([^;]+);base64,(.+)$/);
      if (m) { mimeType = m[1]; b64 = m[2]; }
    }
    const bytes = decodeBase64(b64);
    const { w, h } = readImageDimensions(bytes);
    const image_size_kb = +(bytes.length / 1024).toFixed(1);
    const t_preprocess_ms = +(now() - t_pre_start).toFixed(1);

    const ocrMode = (body as any).mode || (body.isPremium ? "solve_pro" : "solve_free");

    // ── Stage 2 + 3: vision & OCR in parallel (mirrors prod) ──
    const t_v_start = now();
    const visionPromise = callGroqVision(b64, mimeType)
      .then((v) => ({ v, ms: +(now() - t_v_start).toFixed(1) }))
      .catch((e) => ({ v: "", ms: +(now() - t_v_start).toFixed(1), err: String(e) }));

    const t_o_start = now();
    const ocrPromise = callPaddleOCR(bytes, mimeType, ocrMode)
      .then((o) => ({ o, ms: +(now() - t_o_start).toFixed(1) }))
      .catch((e) => ({ o: "", ms: +(now() - t_o_start).toFixed(1), err: String(e) }));

    const [visionRes, ocrRes] = await Promise.all([visionPromise, ocrPromise]);
    const t_groq_vision_ms = visionRes.ms;
    const t_paddleocr_ms = ocrRes.ms;
    const visionText = (visionRes as any).v || "";
    const ocrText = (ocrRes as any).o || "";

    // ── Stage 4: REASONING SUB-STAGES (post-OCR) ──
    // 4a: handoff — time from OCR-finished → starting reasoning prep
    const t_ocr_done = now();
    const t_handoff_start = t_ocr_done;
    // (no awaits between OCR completion and parse start; handoff is just the JS gap)
    const t_handoff_ms = +(now() - t_handoff_start).toFixed(2);

    // 4b: parsing — building the combined prompt from OCR + vision text
    const t_parse_start = now();
    const combined = `Image description:\n${visionText}\n\nExtracted text (OCR):\n${ocrText}\n\nSolve the problem above.`;
    const prompt_token_estimate = estimateTokens(combined);
    const t_parse_ocr_ms = +(now() - t_parse_start).toFixed(2);

    // 4c: reasoning — actual LLM call (network + model inference)
    const t_g_start = now();
    let gptText = "";
    let gptErr: string | undefined;
    try {
      gptText = await callGroqText(combined, !!body.isPremium);
    } catch (e) {
      gptErr = String(e);
    }
    const t_reasoning_ms = +(now() - t_g_start).toFixed(1);
    const t_gpt_oss_ms = t_reasoning_ms; // backward-compat alias

    // 4d: output generation — post-processing/cleanup of LLM response
    const t_out_start = now();
    const response_token_estimate = estimateTokens(gptText);
    // Mirror prod cleanup: trim + minimal LaTeX delimiter normalize
    const cleaned = gptText
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m, i) => `\\[${i.trim()}\\]`)
      .replace(/(?<!\$)(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_m, i) => `\\(${i})\\)`)
      .trim();
    const t_output_gen_ms = +(now() - t_out_start).toFixed(2);
    void cleaned;

    const t_total_ms = +(now() - t_start).toFixed(1);

    // ── Bottleneck detection ──
    const stages: Record<string, number> = {
      vision: t_groq_vision_ms,
      ocr: t_paddleocr_ms,
      llm: t_gpt_oss_ms,
    };
    let bottleneck: string = "unknown";
    let maxMs = 0;
    for (const [k, v] of Object.entries(stages)) {
      if (v > maxMs) { maxMs = v; bottleneck = k; }
    }
    // Vision+OCR run in parallel, so their effective time is the max
    const parallelStage = Math.max(t_groq_vision_ms, t_paddleocr_ms);
    const sumSequential = t_preprocess_ms + parallelStage + t_gpt_oss_ms;
    if (t_total_ms > sumSequential * 1.25) bottleneck = "network";

    const result = {
      health,
      ocr_mode: ocrMode,
      t_preprocess_ms,
      t_groq_vision_ms,
      t_paddleocr_ms,
      t_gpt_oss_ms,
      t_total_ms,
      image_size_kb,
      image_resolution: `${w}x${h}`,
      ocr_text_length: ocrText.length,
      prompt_token_estimate,
      response_token_estimate,
      bottleneck,
      _errors: {
        vision: (visionRes as any).err,
        ocr: (ocrRes as any).err,
        llm: gptErr,
      },
    };

    console.log("[debug-latency]", JSON.stringify(result));

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[debug-latency] error:", e);
    return new Response(JSON.stringify({ error: String(e), t_total_ms: +(now() - t_start).toFixed(1) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
