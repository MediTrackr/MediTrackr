export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendReceiptEmail } from '@/lib/email-service';

export async function POST(request: Request) {
  // 1. Initialize clients inside the request scope
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
    apiVersion: '2025-12-15.acacia' as Stripe.LatestApiVersion 
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Declare variables ONLY here
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody, 
      signature, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error(`❌ Webhook Signature Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    return new Response('Webhook Error', { status: 400 });
  }

  console.log(`🔔 Stripe Event [${event.id}]: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const amount = session.amount_total! / 100;
      const paymentIntentId = session.payment_intent as string;

      if (!paymentIntentId) break;

      try {
        if (!metadata.userId) {
          console.error(`❌ Security: Event ${event.id} missing userId.`);
          break;
        }

        // App-Level Idempotency Guard
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('reference_number', paymentIntentId)
          .maybeSingle();

        if (existingPayment) {
          console.log(`⚠️ Event ${event.id} ignored: already in DB.`);
          break;
        }

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
        const realReceiptUrl = (pi.latest_charge as Stripe.Charge)?.receipt_url;
        let invoiceId = metadata.invoiceId;

        if (!invoiceId || invoiceId === "null" || invoiceId === "undefined") {
          const { data: newInv } = await supabase.from('invoices').insert({
            user_id: metadata.userId,
            patient_name: metadata.patientName || 'Walk-in Patient',
            patient_email: metadata.patientEmail || session.customer_details?.email,
            total_amount: amount,
            amount_paid: amount,
            status: 'paid',
            notes: `Auto-gen from ${event.id}`
          }).select().single();
          invoiceId = newInv.id;
        } else {
          const { data: inv } = await supabase.from('invoices')
            .select('amount_paid, total_amount, user_id')
            .eq('id', invoiceId)
            .single();

          if (inv && inv.user_id !== metadata.userId) break;

          const newPaid = (inv?.amount_paid || 0) + amount;
          const newStatus = newPaid >= (inv?.total_amount || 0) ? 'paid' : 'partial';
          await supabase.from('invoices').update({ amount_paid: newPaid, status: newStatus }).eq('id', invoiceId);
        }

        const { data: payment } = await supabase.from('payments').insert({
          user_id: metadata.userId,
          invoice_id: invoiceId,
          amount: amount,
          reference_number: paymentIntentId,
        }).select().single();

        await supabase.from('receipts').insert({
          user_id: metadata.userId,
          payment_id: payment.id,
          invoice_id: invoiceId,
          patient_email: metadata.patientEmail || session.customer_details?.email,
          amount: amount,
          receipt_url: realReceiptUrl,
          stripe_payment_intent: paymentIntentId
        });

        await sendReceiptEmail({
          to: (metadata.patientEmail || session.customer_details?.email) ?? '',
          patientName: metadata.patientName || 'Patient',
          amount,
          invoiceId,
          transactionId: paymentIntentId,
        });

      } catch (dbErr) {
        console.error(`❌ DB Error [${event.id}]:`, dbErr);
        return new Response('Internal Server Error', { status: 500 });
      }
      break;
    }
  }

  return new Response(null, { status: 204 });
}