"use server";
import { stripe } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";

export async function handleStripeOnboarding(email: string) {
  const supabase = await createClient();

  // Check if user already has a Stripe account
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("email", email)
    .maybeSingle();

  let accountId = profile?.stripe_account_id as string | undefined;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;

    await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("email", email);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    type: "account_onboarding",
  });

  return accountLink.url;
}
