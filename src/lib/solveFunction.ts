import { supabase } from "@/integrations/supabase/client";

type SolveInvokeResult = {
  data: any;
  error: any;
};

export async function invokeSolveHomework(
  body: Record<string, unknown>,
  timeoutMs = 45000,
): Promise<SolveInvokeResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      supabase.functions.invoke("solve-homework", { body }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("solve_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function getSolveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message.includes("solve_timeout")) {
    return "This is taking too long. Please try again.";
  }
  if (message.includes("429") || /rate limit|busy/i.test(message)) {
    return "AI is busy. Please try again in a moment.";
  }
  return "Couldn't solve that. Please try again.";
}