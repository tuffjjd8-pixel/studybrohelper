import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Creating portal session for user:", userId);

    // Get user's subscription_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile data:", JSON.stringify(profile));

    if (!profile?.subscription_id) {
      console.error("No subscription found for user:", userId);
      return new Response(
        JSON.stringify({ error: "No active subscription found. Please contact support if you believe this is an error." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found subscription_id:", profile.subscription_id);

    // Get stripe mode from app_settings
    const { data: modeData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_mode")
      .maybeSingle();

    const stripeMode = modeData?.value || "test";
    console.log("Stripe mode:", stripeMode);

    // Use appropriate Stripe secret key based on mode
    const stripeSecretKey = stripeMode === "live"
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    if (!stripeSecretKey) {
      console.error("Stripe secret key not configured for mode:", stripeMode);
      return new Response(
        JSON.stringify({ error: "Stripe not configured properly" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the subscription to get the customer ID
    console.log("Retrieving subscription from Stripe:", profile.subscription_id);
    let customerId: string;
    
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.subscription_id);
      customerId = subscription.customer as string;
      console.log("Found customer ID from subscription:", customerId);
    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
      console.error("Stripe subscription retrieval error:", errorMessage);
      
      // Check if it's a mode mismatch error
      if (errorMessage.includes("test mode") || errorMessage.includes("live mode")) {
        return new Response(
          JSON.stringify({ 
            error: "Your subscription was created in a different environment. Please contact support for assistance." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to retrieve subscription. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create billing portal session
    console.log("Creating billing portal session for customer:", customerId);
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: "https://studybrohelper.lovable.app/profile",
      });

      console.log("Successfully created portal session:", session.url);

      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (portalError: unknown) {
      const errorMessage = portalError instanceof Error ? portalError.message : "Failed to create portal session";
      console.error("Portal session creation error:", errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});