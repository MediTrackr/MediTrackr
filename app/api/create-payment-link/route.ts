import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_PROVIDER_API_KEY;

    if (!apiKey) {
      console.error("Missing Stripe API Key in environment variables");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    // Initialize the Stripe client with the exact version required by your types
    const stripe = new Stripe(apiKey, {
      apiVersion: "2025-12-15.clover" as any, 
    });

    const body = await req.json();
    const { amount, currency, description } = body;

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency || "cad",
            product_data: {
              name: description || "Service",
            },
            unit_amount: amount, 
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });

  } catch (error: any) {
    console.error("Payment Link Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create link" }, { status: 500 });
  }
}
