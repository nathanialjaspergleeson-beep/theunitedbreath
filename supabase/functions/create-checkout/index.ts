import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map product IDs to Stripe price IDs
const PRICE_MAP: Record<string, string> = {
  "guided-ice": "price_1T9GqjLzP4mD1Q6QvjXlOveF",
  "sleep-audio": "price_1T9GqlLzP4mD1Q6QQR5ZfdqT",
  "21-day-reset": "price_1T9GqmLzP4mD1Q6Q8fICzGlC",
  "sleep-mask": "price_1T9GqnLzP4mD1Q6QdyY0N9pA",
  "breath-trainer": "price_1T9GqpLzP4mD1Q6Q9g6R8CIB",
  "tshirt": "price_1T9GqqLzP4mD1Q6QFeH8jBGa",
  "thermometer": "price_1T9GqrLzP4mD1Q6QploT5hpC",
  "starter-kit": "price_1T9GqtLzP4mD1Q6Q2MC5Slk1",
};

// Allowlist of trusted origins for Stripe redirects.
const ALLOWED_ORIGINS = new Set<string>([
  "https://unitedbreath.au",
  "https://www.unitedbreath.au",
  "https://unitedbreath.lovable.app",
  "https://id-preview--1018b8b1-d4b7-4fc1-9069-8890cee166f7.lovable.app",
]);
const DEFAULT_ORIGIN = "https://unitedbreath.au";

function resolveOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Allow lovable preview subdomains for this project
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" && u.hostname.endsWith(".lovable.app")) {
      return origin;
    }
  } catch {
    // fall through
  }
  return DEFAULT_ORIGIN;
}

// Very small in-memory IP rate limit (best-effort; per-instance).
const RATE_LIMIT_MAX = 20; // requests
const RATE_LIMIT_WINDOW_MS = 60_000; // per minute
const rateBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.reset < now) {
    rateBuckets.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT_MAX;
}

const MAX_ITEMS = 50;
const MAX_QTY_PER_ITEM = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      return new Response(
        JSON.stringify({ error: "Invalid request." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const line_items = [];
    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QTY_PER_ITEM
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid request." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      const priceId = PRICE_MAP[item.productId];
      if (!priceId) {
        return new Response(
          JSON.stringify({ error: "Invalid request." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      line_items.push({ price: priceId, quantity: item.quantity });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Checkout is temporarily unavailable." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = resolveOrigin(req);

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/payment-canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Checkout failed. Please try again." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
