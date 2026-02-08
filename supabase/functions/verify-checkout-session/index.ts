import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Parse request body
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying checkout session: ${sessionId}`);

    // Get Supabase client to read stripe mode setting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const userId = session.client_reference_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "No user ID associated with session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST MODE GUARD: Only allow developer account to activate premium in test mode
    const DEVELOPER_EMAIL = "apexwavesstudios@gmail.com";
    if (isTestMode) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;
      console.log(`Test mode check: userId=${userId}, email=${userEmail}`);

      if (userEmail !== DEVELOPER_EMAIL) {
        console.log(`Test mode purchase blocked for non-developer: ${userEmail}`);
        return new Response(
          JSON.stringify({ success: true, message: "Test mode — no premium activated" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Test mode purchase allowed for developer account");
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
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to activate premium" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Premium activated for user: ${userId}`);

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
