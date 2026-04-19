// Pass-through proxy: browser -> this function (HTTPS) -> OCR server (HTTP).
// Streams the raw multipart body straight through (no re-parsing/re-encoding)
// to minimize latency. Reports per-stage timing in response headers.

const OCR_URL = "http://46.224.199.130:8000/ocr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-proxy-ms, x-upstream-ms, x-upload-bytes",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const t0 = performance.now();
  try {
    // Pass body through as a raw stream — no formData() round-trip.
    const contentType = req.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = req.headers.get("content-length") ?? "";

    // Read body once into bytes (Deno fetch can't always re-stream a Request body to fetch).
    const bodyBytes = new Uint8Array(await req.arrayBuffer());
    const t_read = performance.now();

    const upstream = await fetch(OCR_URL, {
      method: "POST",
      headers: { "content-type": contentType },
      body: bodyBytes,
    });
    const t_upstream = performance.now();

    const text = await upstream.text();
    const t_done = performance.now();

    const proxy_ms = Math.round(t_done - t0);
    const upstream_ms = Math.round(t_upstream - t_read);
    const read_ms = Math.round(t_read - t0);
    console.log(`[ocr-proxy] bytes=${bodyBytes.length} read=${read_ms}ms upstream=${upstream_ms}ms total=${proxy_ms}ms status=${upstream.status}`);

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "x-proxy-ms": String(proxy_ms),
        "x-upstream-ms": String(upstream_ms),
        "x-upload-bytes": String(bodyBytes.length),
      },
    });
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    console.error(`[ocr-proxy] error after ${ms}ms`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "OCR proxy failed", proxy_ms: ms }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
