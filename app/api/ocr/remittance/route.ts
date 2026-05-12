import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { logAuditTrail } from '@/lib/compliance/audit-middleware';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROMPT = `You are parsing a RAMQ remittance report (Avis de paiement / Bordereau de paiement) sent by the Régie de l'assurance maladie du Québec to a physician.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation.

Use this exact structure:
{
  "reportType": "RAMQ_REMITTANCE",
  "confidence": <integer 0-100>,
  "paymentDate": <"YYYY-MM-DD" or null>,
  "batchNumber": <string or null>,
  "practitionerNumber": <string or null>,
  "totalClaimed": <number or null>,
  "totalApproved": <number or null>,
  "totalWithheld": <number or null>,
  "netPayment": <number or null>,
  "claims": [
    {
      "claimNumber": <string or null>,
      "patientRamq": <string or null>,
      "patientName": <string or null>,
      "serviceDate": <"YYYY-MM-DD" or null>,
      "actCode": <string or null>,
      "amountClaimed": <number or null>,
      "amountApproved": <number or null>,
      "amountWithheld": <number or null>,
      "reductionCode": <string or null>,
      "reductionReason": <string or null>
    }
  ],
  "notes": <any relevant text not captured above, or null>
}

Extraction rules:
- Extract every claim line visible in the document.
- For amounts: return numbers only (no $ sign, no spaces). E.g. "$1 234.56" → 1234.56
- For dates: convert to YYYY-MM-DD. If only month/year visible, use the 1st of the month.
- patientRamq: the Quebec health insurance number (AAAA NNNN NNNN format — 4 letters + 8 digits). Extract with or without spaces.
- reductionCode: RAMQ rejection/adjustment code (e.g. "06", "14", "41"). Null if fully approved.
- reductionReason: human-readable reason for reduction (e.g. "Code incompatible", "Délai dépassé"). Null if no reduction.
- totalWithheld: difference between totalClaimed and totalApproved. Compute it if not explicit.
- confidence: your confidence that this is a real RAMQ remittance report (0=not a remittance, 100=certain).
- If the document is NOT a RAMQ remittance report, still return the JSON with confidence=0 and all other fields null/empty.`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image, fileName } = await request.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mediaType = (mediaTypeMatch?.[1] ?? 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonStart = text.indexOf('{');
    const jsonEnd   = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return NextResponse.json({ error: 'Could not parse OCR response' }, { status: 500 });
    }

    const result = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // Save import record + match claims
    const importRes = await supabase.from('remittance_imports').insert({
      user_id:        user.id,
      file_name:      fileName ?? null,
      payment_date:   result.paymentDate ?? null,
      batch_number:   result.batchNumber ?? null,
      total_approved: result.totalApproved ?? null,
      total_withheld: result.totalWithheld ?? null,
      net_payment:    result.netPayment ?? null,
      raw_extract:    result,
      status:         'pending',
    }).select('id').single();

    if (importRes.error || !importRes.data) {
      return NextResponse.json({ error: 'Failed to save import', detail: importRes.error }, { status: 500 });
    }

    const importId = importRes.data.id;

    // Try to match each extracted claim line against existing ramq_claims
    const lines = (result.claims ?? []) as Array<{
      claimNumber?: string; patientRamq?: string; patientName?: string;
      serviceDate?: string; actCode?: string; amountClaimed?: number;
      amountApproved?: number; amountWithheld?: number;
      reductionCode?: string; reductionReason?: string;
    }>;

    let appliedCount = 0;
    const lineRows = [];

    for (const line of lines) {
      // Match by claim_number if present, otherwise by patient RAMQ + service date
      let matchedId: string | null = null;

      if (line.claimNumber) {
        const { data: m } = await supabase
          .from('ramq_claims')
          .select('id')
          .eq('user_id', user.id)
          .eq('claim_number', line.claimNumber)
          .maybeSingle();
        matchedId = m?.id ?? null;
      }

      if (!matchedId && line.patientRamq && line.serviceDate) {
        const cleanRamq = (line.patientRamq ?? '').replace(/\s+/g, '');
        const { data: m } = await supabase
          .from('ramq_claims')
          .select('id')
          .eq('user_id', user.id)
          .ilike('patient_ramq', `%${cleanRamq}%`)
          .eq('service_date', line.serviceDate)
          .maybeSingle();
        matchedId = m?.id ?? null;
      }

      if (matchedId) appliedCount++;

      lineRows.push({
        import_id:        importId,
        user_id:          user.id,
        claim_number:     line.claimNumber ?? null,
        matched_claim_id: matchedId,
        patient_ramq:     (line.patientRamq ?? '').replace(/\s+/g, '') || null,
        service_date:     line.serviceDate ?? null,
        act_code:         line.actCode ?? null,
        amount_claimed:   line.amountClaimed ?? null,
        amount_approved:  line.amountApproved ?? null,
        amount_withheld:  line.amountWithheld ?? null,
        reduction_code:   line.reductionCode ?? null,
        reduction_reason: line.reductionReason ?? null,
      });
    }

    if (lineRows.length > 0) {
      await supabase.from('remittance_lines').insert(lineRows);
    }

    await supabase.from('remittance_imports').update({
      applied_count:   appliedCount,
      unmatched_count: lines.length - appliedCount,
      status:          appliedCount === lines.length && lines.length > 0 ? 'pending' : 'pending',
    }).eq('id', importId);

    await logAuditTrail(
      { table_name: 'remittance_imports', record_id: importId, action: 'INSERT',
        reason: `Remittance import: ${lines.length} lines, ${appliedCount} matched — image discarded` },
      request
    );

    return NextResponse.json({
      importId,
      confidence:    result.confidence,
      paymentDate:   result.paymentDate,
      batchNumber:   result.batchNumber,
      totalApproved: result.totalApproved,
      totalWithheld: result.totalWithheld,
      netPayment:    result.netPayment,
      claimsFound:   lines.length,
      matchedCount:  appliedCount,
      lines:         lineRows.map((l, i) => ({ ...l, matched: !!l.matched_claim_id, lineIndex: i })),
    });
  } catch (error: unknown) {
    console.error('Remittance OCR error:', error);
    const msg = (error as Error)?.message ?? 'Processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
