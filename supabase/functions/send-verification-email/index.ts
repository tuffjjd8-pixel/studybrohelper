import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

function isValidEmailDomain(email: string): boolean {
  const emailRegex = /^[^\s@]+@([^\s@]+)$/;
  const match = email.toLowerCase().match(emailRegex);
  
  if (!match) return false;
  
  const domain = match[1];
  return ALLOWED_DOMAINS.includes(domain);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, isResend } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing userId or email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email domain
    if (!isValidEmailDomain(email)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid email domain", 
          message: "Please use an email from: gmail.com, yahoo.com, outlook.com, hotmail.com, or icloud.com" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If resending, invalidate previous codes
    if (isResend) {
      await supabase
        .from("email_verification_codes")
        .update({ used: true })
        .eq("user_id", userId)
        .eq("used", false);
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the code in the database
    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        user_id: userId,
        email: email,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Failed to store verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email using Resend
    const resend = new Resend(resendApiKey);
    
    const { error: emailError } = await resend.emails.send({
      from: "StudyBro <noreply@resend.dev>",
      to: [email],
      subject: "Verify your StudyBro account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">🧠</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Verify Your Email</h1>
            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px;">Enter this code to complete your registration:</p>
            <div style="background: #0a0a0a; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <span style="font-family: 'Monaco', 'Consolas', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8b5cf6;">${code}</span>
            </div>
            <p style="color: #71717a; font-size: 12px; margin: 0;">This code expires in 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;">
            <p style="color: #52525b; font-size: 11px; margin: 0;">If you didn't create a StudyBro account, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verification email sent to ${email} for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
