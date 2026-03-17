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

    // Parse request body (only plan is needed; userId is ignored in favor of JWT)
    const { plan } = await req.json();

    if (!plan || !["monthly", "weekend", "yearly", "lifetime", "two_year"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "plan must be 'monthly', 'weekend', 'yearly', 'lifetime', or 'two_year'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Supabase service client to read stripe mode setting
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
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the correct price ID based on plan and mode
    let priceId: string | undefined;
    if (isTestMode) {
      switch (plan) {
        case "monthly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_NORMAL_TEST");
          break;
        case "weekend":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_WEEKEND_TEST");
          break;
        case "yearly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_YEARLY_TEST");
          break;
        case "lifetime":
          priceId = Deno.env.get("STRIPE_PRICE_ID_LIFETIME_TEST");
          break;
      }
    } else {
      switch (plan) {
        case "monthly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_NORMAL");
          break;
        case "weekend":
          priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY_WEEKEND");
          break;
        case "yearly":
          priceId = Deno.env.get("STRIPE_PRICE_ID_YEARLY");
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

    console.log(`Creating checkout session for user ${verifiedUserId}, plan: ${plan}, priceId: ${priceId}, mode: ${stripeMode}`);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Create checkout session
    const sessionMode = plan === "lifetime" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      mode: sessionMode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "https://studybrohelper.lovable.app/premium/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://studybrohelper.lovable.app/premium/cancel",
      client_reference_id: verifiedUserId,
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
