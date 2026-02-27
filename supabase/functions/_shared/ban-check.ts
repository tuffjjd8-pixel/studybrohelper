// Shared utility to check if a user is banned or temporarily limited
// Uses service role to bypass RLS

export async function checkUserBlocked(userId: string | null): Promise<{ banned: boolean; limited: boolean }> {
  if (!userId) return { banned: false, limited: false };
  
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data, error } = await sb.rpc("is_user_blocked", { target_user_id: userId });
    if (error) {
      console.error("[BanCheck] RPC error:", error);
      return { banned: false, limited: false };
    }
    
    return {
      banned: data?.banned === true,
      limited: data?.limited === true,
    };
  } catch (err) {
    console.error("[BanCheck] Failed:", err);
    return { banned: false, limited: false };
  }
}

export function blockedResponse(status: { banned: boolean; limited: boolean }, corsHeaders: Record<string, string>): Response | null {
  if (status.banned) {
    return new Response(
      JSON.stringify({ error: "Your account has been suspended." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (status.limited) {
    return new Response(
      JSON.stringify({ error: "Your account is temporarily restricted. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}
