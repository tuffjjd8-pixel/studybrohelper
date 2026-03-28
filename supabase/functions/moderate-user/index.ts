import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user || user.email !== "apexwavesstudios@gmail.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { action, target_user_id, duration_hours = 24 } = await req.json();

    if (!target_user_id || !action) {
      return new Response(JSON.stringify({ error: "Missing action or target_user_id" }), { status: 400, headers: corsHeaders });
    }

    if (action === "ban") {
      const { error } = await supabaseAdmin
        .from("banned_users")
        .upsert({ user_id: target_user_id, banned_at: new Date().toISOString(), created_by: user.id }, { onConflict: "user_id" });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User has been banned." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "limit") {
      const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
      const { error } = await supabaseAdmin
        .from("user_limits")
        .insert({ user_id: target_user_id, expires_at: expiresAt, created_by: user.id });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User has been temporarily limited." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Moderate user error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
