/**
 * Helper function to get Google OAuth keys from environment.
 * This is used in edge functions to retrieve stored credentials.
 * 
 * Note: These keys should be stored via Lovable Cloud Secrets as:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */
export function getGoogleOAuthKeys(): { clientId: string | undefined; clientSecret: string | undefined } {
  return {
    clientId: Deno.env.get("GOOGLE_CLIENT_ID"),
    clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
  };
}
