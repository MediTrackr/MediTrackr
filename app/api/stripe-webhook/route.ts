import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover" as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // INITIALIZE RESEND INSIDE THE POST FUNCTION
  // This prevents the "Missing API Key" error during build time
  const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Logic for sending emails or updating Supabase goes here
    console.log("Payment successful for session:", session.id);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
