// Fire-and-forget security event logger
// Uses service role to bypass RLS (no client inserts allowed)

const INJECTION_PATTERNS = [
  /system\s*prompt/i,
  /ignore\s*(previous|all)\s*instructions/i,
  /reveal\s*(your|the)\s*(instructions|prompt|rules)/i,
  /act\s*as\s*(a\s*)?(debugger|admin|developer)/i,
  /execute\s*sql/i,
  /run\s*code/i,
  /access\s*database/i,
  /show\s*me\s*(your|the)\s*(prompt|instructions|config)/i,
  /pretend\s*(you|to)\s*(have|are)/i,
  /admin\s*mode/i,
  /debug_mode/i,
  /internal_instructions/i,
  /administrator_guidance/i,
  /studybro_ai_protocol/i,
  /startup\s*(log|instruction|data)/i,
];

export function detectInjection(message: string): { detected: boolean; type: string; severity: string } {
  const lower = message.toLowerCase();
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      const severity = lower.includes("execute") || lower.includes("sql") || lower.includes("database") 
        ? "high" 
        : "medium";
      return { detected: true, type: "prompt_injection", severity };
    }
  }
  
  return { detected: false, type: "", severity: "" };
}

export async function logSecurityEvent(
  eventType: string,
  severity: string,
  userMessage: string | null,
  userId: string | null,
) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await sb.from("security_events").insert({
      event_type: eventType,
      severity,
      user_message: userMessage?.substring(0, 500) || null,
      user_id: userId,
    });
  } catch (err) {
    console.error("[SecurityLogger] Failed to log event:", err);
  }
}
