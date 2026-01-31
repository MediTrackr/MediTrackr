import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: Request) {
  try {
    const { invoiceId, amount, patientName, patientEmail } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const paymentLink = await stripe.paymentLinks.create({
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
      metadata: { userId: user.id, invoiceId, patientName, patientEmail },
      after_completion: {
        type: 'redirect',
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?invoice=${invoiceId}` },
      },
    });

    return NextResponse.json({ paymentUrl: paymentLink.url, paymentLinkId: paymentLink.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
