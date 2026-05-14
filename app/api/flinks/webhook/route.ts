import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Flinks sends deposit notifications to this endpoint.
// We store the deposit and attempt to auto-match it against expected RAMQ batches.

const FLINKS_WEBHOOK_SECRET = process.env.FLINKS_WEBHOOK_SECRET ?? '';
const MATCH_TOLERANCE = 0.02; // 2% tolerance for approximate matches

export async function POST(req: NextRequest) {
  // Verify Flinks webhook signature
  const signature = req.headers.get('x-flinks-signature');
  if (FLINKS_WEBHOOK_SECRET && signature !== FLINKS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();

  // Flinks transaction webhook shape
  const {
    LoginId:      flinksLoginId,
    AccountId:    flinksAccountId,
    Transactions: transactions = [],
  } = payload;

  if (!flinksLoginId || !transactions.length) {
    return NextResponse.json({ received: true });
  }

  const supabase = await createClient();

  // Look up which user this Flinks loginId belongs to
  const { data: flinksAccount } = await supabase
    .from('flinks_accounts')
    .select('user_id, institution')
    .eq('flinks_login_id', flinksLoginId)
    .single();

  if (!flinksAccount) {
    return NextResponse.json({ error: 'Unknown Flinks account' }, { status: 404 });
  }

  const { user_id, institution } = flinksAccount;
  const results = [];

  for (const tx of transactions) {
    // Only process credits (incoming deposits)
    if (tx.Debit > 0 || tx.Credit <= 0) continue;

    const amount      = parseFloat(tx.Credit);
    const depositDate = tx.Date?.split('T')[0] ?? new Date().toISOString().split('T')[0];

    // Upsert deposit record
    const { data: deposit, error: depositError } = await supabase
      .from('bank_deposits')
      .upsert({
        user_id,
        flinks_account_id:     flinksAccountId,
        flinks_transaction_id: tx.Id,
        amount,
        deposit_date:          depositDate,
        description:           tx.Description ?? null,
        institution:           institution ?? null,
        raw_payload:           tx,
      }, { onConflict: 'flinks_transaction_id' })
      .select()
      .single();

    if (depositError || !deposit) continue;

    // Attempt to match against expected RAMQ payments in shadow_ledger
    const matched = await matchDepositToClaims(supabase, user_id, deposit.id, amount, depositDate);
    results.push({ transaction_id: tx.Id, amount, matched });
  }

  // Update last_synced_at
  await supabase
    .from('flinks_accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('flinks_login_id', flinksLoginId);

  return NextResponse.json({ received: true, processed: results.length, results });
}

async function matchDepositToClaims(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  depositId: string,
  depositAmount: number,
  depositDate: string
) {
  // Find unreconciled shadow_ledger entries for this user
  // where expected_amount is close to the deposit amount
  const { data: ledgerEntries } = await supabase
    .from('shadow_ledger')
    .select('id, source_id, source_type, expected_amount, expected_date, batch_id')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('expected_date', { ascending: false });

  if (!ledgerEntries?.length) return false;

  // Find best match — exact first, then approximate
  let bestMatch = null;
  let confidence: 'exact' | 'approximate' = 'approximate';

  for (const entry of ledgerEntries) {
    const expected = parseFloat(entry.expected_amount);
    const diff = Math.abs(expected - depositAmount) / expected;

    if (diff === 0) {
      bestMatch = entry;
      confidence = 'exact';
      break;
    }

    if (diff <= MATCH_TOLERANCE && !bestMatch) {
      bestMatch = entry;
      confidence = 'approximate';
    }
  }

  if (!bestMatch) {
    // No match — leave as unmatched, doctor will see it in review
    return false;
  }

  // Update bank_deposit with match info
  const claimIds = await getClaimIdsForBatch(supabase, userId, bestMatch.batch_id);

  await supabase
    .from('bank_deposits')
    .update({
      matched_batch_id:  bestMatch.batch_id ?? null,
      matched_claim_ids: claimIds,
      match_confidence:  confidence,
      status:            'matched',
    })
    .eq('id', depositId);

  // Update all claims in the batch to deposit_received
  if (bestMatch.batch_id) {
    await supabase
      .from('ramq_claims')
      .update({
        status:               'deposit_received',
        deposit_detected_at:  new Date().toISOString(),
        deposit_amount:       depositAmount,
        deposit_id:           depositId,
      })
      .eq('user_id', userId)
      .eq('batch_id', bestMatch.batch_id)
      .in('status', ['submitted', 'approved']);
  }

  // Mark shadow_ledger entry as partially resolved (deposit seen, remittance pending)
  await supabase
    .from('shadow_ledger')
    .update({ actual_amount: depositAmount, actual_date: depositDate })
    .eq('id', bestMatch.id);

  return { batch_id: bestMatch.batch_id, confidence, claim_count: claimIds.length };
}

async function getClaimIdsForBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  batchId: string | null
): Promise<string[]> {
  if (!batchId) return [];
  const { data } = await supabase
    .from('ramq_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('batch_id', batchId);
  return data?.map(r => r.id) ?? [];
}
