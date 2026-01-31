import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendReceiptEmail } from '@/lib/email-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
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
      const paymentIntentId = session.payment_intent;

      // 1. Guard against missing payment_intent (Edge-case safety)
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        console.warn(`⚠️ Event ${event.id} missing or invalid payment_intent`);
        break;
      }

      try {
        // 2. Metadata Sanity & Ownership Boundary Check
        if (!metadata.userId) {
          console.error(`❌ Security: Event ${event.id} missing userId in metadata.`);
          break;
        }

        // 3. App-Level Idempotency Guard
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('reference_number', paymentIntentId)
          .maybeSingle();

        if (existingPayment) {
          console.log(`⚠️ Event ${event.id} ignored: ID ${paymentIntentId} already in DB.`);
          break;
        }

        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
        const realReceiptUrl = (pi.latest_charge as Stripe.Charge)?.receipt_url;
        let invoiceId = metadata.invoiceId;

        // 4. Auto-Invoice or Partial Logic
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
          // Verify invoice ownership before update
          const { data: inv } = await supabase.from('invoices')
            .select('amount_paid, total_amount, user_id')
            .eq('id', invoiceId)
            .single();

          if (inv && inv.user_id !== metadata.userId) {
             console.error(`❌ Security: Invoice ${invoiceId} does not belong to User ${metadata.userId}`);
             break;
          }

          const newPaid = (inv?.amount_paid || 0) + amount;
          const newStatus = newPaid >= (inv?.total_amount || 0) ? 'paid' : 'partial';
          await supabase.from('invoices').update({ amount_paid: newPaid, status: newStatus }).eq('id', invoiceId);
        }

        // 5. Explicit Debug Logging for Stripe Support
        console.log('📄 Webhook Processing Details:', { eventId: event.id, type: event.type, paymentIntentId, invoiceId });

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

        try {
          await sendReceiptEmail({
            to: metadata.patientEmail || session.customer_details?.email,
            patientName: metadata.patientName || 'Patient',
            amount,
            invoiceId,
            paymentId: payment.id,
            transactionId: paymentIntentId,
          });
        } catch (e) { console.error('📧 Email soft-fail:', e); }

      } catch (dbErr) {
        console.error(`❌ DB Error [${event.id}]:`, dbErr);
        return new Response('Internal Server Error', { status: 500 });
      }
      break;
    }
  }

  return new Response(null, { status: 204 });
}
