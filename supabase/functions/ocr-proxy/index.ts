// Pass-through proxy: browser -> this function (HTTPS) -> OCR server (HTTP).
// Solves mixed-content blocking. Forwards multipart/form-data unchanged.

const OCR_URL = "http://46.224.199.130:8000/ocr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const t0 = performance.now();
    const form = await req.formData();
    const upstream = await fetch(OCR_URL, { method: "POST", body: form });
    const total_ms = Math.round(performance.now() - t0);
    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "x-proxy-ms": String(total_ms),
      },
    });
  } catch (err) {
    console.error("[ocr-proxy] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "OCR proxy failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
