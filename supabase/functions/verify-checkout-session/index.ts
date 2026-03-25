import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and extract authenticated user ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const verifiedUserId = claimsData.claims.sub as string;

    // Parse request body
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying checkout session: ${sessionId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read stripe mode from app_settings
    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_mode")
      .single();

    const stripeMode = settingData?.value || "live";
    const isTestMode = stripeMode === "test";

    console.log(`Stripe mode: ${stripeMode}, isTestMode: ${isTestMode}`);

    // Get Stripe secret key based on mode
    const stripeSecretKey = isTestMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");

    if (!stripeSecretKey) {
      console.error(`STRIPE_SECRET_KEY_${isTestMode ? 'TEST' : 'LIVE'} not configured`);
      return new Response(
        JSON.stringify({ success: false, error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log(`Session status: ${session.status}, payment_status: ${session.payment_status}`);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the session belongs to the authenticated user
    const sessionUserId = session.client_reference_id;
    if (!sessionUserId || sessionUserId !== verifiedUserId) {
      console.error(`Session user mismatch: session=${sessionUserId}, caller=${verifiedUserId}`);
      return new Response(
        JSON.stringify({ success: false, error: "Session does not belong to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a two_year plan (one-time, 24-month premium)
    const planType = session.metadata?.plan;

    if (planType === "two_year") {
      // Fetch current profile to check existing premium_until
      const { data: profile } = await supabase
        .from("profiles")
        .select("premium_until")
        .eq("user_id", verifiedUserId)
        .single();

      const now = new Date();
      const existingExpiry = profile?.premium_until ? new Date(profile.premium_until) : null;
      const baseDate = existingExpiry && existingExpiry > now ? existingExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + 24);
      const premiumUntil = newExpiry.toISOString();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: premiumUntil,
        })
        .eq("user_id", verifiedUserId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to activate premium" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`2-Year Premium activated for user: ${verifiedUserId}, expires: ${premiumUntil}`);

      return new Response(
        JSON.stringify({ success: true, message: "2-Year Premium activated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscription details for renewal date
    let renewalDate: string | null = null;
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
    }

    // Update user profile to premium
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_premium: true,
        subscription_id: session.subscription as string || null,
        renewal_date: renewalDate,
        premium_until: renewalDate,
      })
      .eq("user_id", verifiedUserId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to activate premium" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Premium activated for user: ${verifiedUserId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Premium activated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify session";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
