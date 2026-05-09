import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.acacia' as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  try {
    const { invoiceId, amount, patientName, patientEmail } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Invoice Payment - ${invoiceId}`,
            description: `Medical services for ${patientName}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: patientEmail || undefined,
      metadata: { userId: user.id, invoiceId, patientName, patientEmail },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?invoice=${invoiceId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ paymentUrl: session.url, sessionId: session.id });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
