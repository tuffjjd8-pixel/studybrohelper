import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, plan } = await req.json();

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!plan || !["monthly", "lifetime"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "plan must be 'monthly' or 'lifetime'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_mode")
      .single();

    const stripeMode = settingData?.value || "live";
    const isTestMode = stripeMode === "test";

    console.log(`Stripe mode: ${stripeMode}, isTestMode: ${isTestMode}`);

    const stripeSecretKey = isTestMode
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");

    if (!stripeSecretKey) {
      console.error(`STRIPE_SECRET_KEY_${isTestMode ? "TEST" : "LIVE"} not configured`);
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let priceId: string | undefined;
    if (isTestMode) {
      switch (plan) {
        case "monthly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_WEEKEND_TEST");
          break;
        case "lifetime":
          priceId = Deno.env.get("STRIPE_PRICE_ID_LIFETIME_TEST");
          break;
      }
    } else {
      switch (plan) {
        case "monthly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_WEEKEND");
          break;
        case "lifetime":
          priceId = Deno.env.get("STRIPE_PRICE_ID_LIFETIME_LIVE");
          break;
      }
    }

    if (!priceId) {
      console.error(`Price ID not configured for plan: ${plan} in ${stripeMode} mode`);
      return new Response(
        JSON.stringify({ error: `Price not configured for ${plan} plan` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST MODE GUARD
    const DEVELOPER_EMAIL = "apexwavesstudios@gmail.com";
    if (isTestMode) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;
      console.log(`Test mode checkout check: userId=${userId}, email=${userEmail}`);

      if (userEmail !== DEVELOPER_EMAIL) {
        console.log(`Test mode checkout blocked for non-developer: ${userEmail}`);
        return new Response(
          JSON.stringify({ error: "Test mode checkout not available" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Creating checkout session for user ${userId}, plan: ${plan}, priceId: ${priceId}, mode: ${stripeMode}`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Lifetime is a one-time payment, monthly is a subscription
    const isLifetime = plan === "lifetime";

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? "payment" : "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "https://studybrohelper.lovable.app/premium/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://studybrohelper.lovable.app/premium/cancel",
      client_reference_id: userId,
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create checkout session";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
