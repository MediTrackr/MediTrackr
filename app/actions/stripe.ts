"use server";
import { stripe } from "@/utils/stripe";
import { createClient } from "@/lib/supabase/server";

export async function handleStripeOnboarding(email: string) {
  const supabase = await createClient();

  // 1. Stripe will return the existing account if it finds a match
  const account = await stripe.accounts.create({
    type: 'express',
    email: email,
    capabilities: { transfers: { requested: true } },
  });

  // 2. Update Supabase to ensure the ID is synced
  await supabase
    .from('profiles')
    .update({ stripe_account_id: account.id })
    .eq('email', email);

  // 3. Generate the link (Stripe handles the "already finished" logic)
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_URL}/settings`,
    return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}
