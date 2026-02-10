import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      console.error("Missing Stripe configuration");
      return new Response(
        JSON.stringify({ error: "Missing Stripe configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`Webhook signature verification failed: ${errorMessage}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing Stripe event: ${event.type}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("No client_reference_id found in session");
          break;
        }

        console.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`);

        // Fetch subscription to get current_period_end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

        const { error } = await supabase
          .from("profiles")
          .update({
            is_premium: true,
            subscription_id: subscriptionId,
            renewal_date: renewalDate,
            premium_until: renewalDate,
          })
          .eq("user_id", userId);

        if (error) {
          console.error(`Failed to update user ${userId}:`, error);
        } else {
          console.log(`User ${userId} upgraded to premium, renewal: ${renewalDate}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
        const isActive = subscription.status === "active" || subscription.status === "trialing";

        console.log(`Subscription ${subscriptionId} updated, status: ${subscription.status}`);

        const { error } = await supabase
          .from("profiles")
          .update({
            is_premium: isActive,
            renewal_date: renewalDate,
            premium_until: renewalDate,
          })
          .eq("subscription_id", subscriptionId);

        if (error) {
          console.error(`Failed to update subscription ${subscriptionId}:`, error);
        } else {
          console.log(`Subscription ${subscriptionId} updated, active: ${isActive}, renewal: ${renewalDate}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        console.log(`Subscription ${subscriptionId} deleted`);

        const { error } = await supabase
          .from("profiles")
          .update({
            is_premium: false,
            subscription_id: null,
            renewal_date: null,
            premium_until: null,
          })
          .eq("subscription_id", subscriptionId);

        if (error) {
          console.error(`Failed to update cancelled subscription ${subscriptionId}:`, error);
        } else {
          console.log(`Subscription ${subscriptionId} cancelled, user downgraded`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook error: ${errorMessage}`);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
