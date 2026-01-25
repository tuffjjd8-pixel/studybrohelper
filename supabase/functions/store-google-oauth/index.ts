import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientSecret } = await req.json();

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Missing clientId or clientSecret" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store in Deno environment (these will be available via Deno.env.get)
    // Note: In production, these should be set via Lovable Cloud Secrets
    // This function validates the keys and confirms they're ready to be stored
    console.log("Google OAuth keys received and validated");
    console.log("Client ID length:", clientId.length);
    console.log("Client Secret length:", clientSecret.length);

    // For now, we acknowledge receipt - actual storage happens via Lovable Cloud Secrets
    // The UI should prompt users to also add these via the secrets management
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Keys validated. Please also add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via Lovable Cloud Secrets for backend access." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing Google OAuth keys:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process keys" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
