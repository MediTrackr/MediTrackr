import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { logAuditTrail } from '@/lib/compliance/audit-middleware';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROMPT = `You are parsing a PFSI / IFHP Explanation of Benefits (EOB) or Remittance Advice from Medavie Blue Cross, the administrator of Canada's Interim Federal Health Program for refugees and protected persons.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation.

{
  "reportType": "PFSI_EOB",
  "confidence": <integer 0-100>,
  "paymentDate": <"YYYY-MM-DD" or null>,
  "chequeNumber": <string or null>,
  "providerNumber": <string or null>,
  "totalClaimed": <number or null>,
  "totalApproved": <number or null>,
  "totalWithheld": <number or null>,
  "netPayment": <number or null>,
  "claims": [
    {
      "claimNumber": <string or null>,
      "clientId": <string or null>,
      "patientName": <string or null>,
      "serviceDate": <"YYYY-MM-DD" or null>,
      "feeCode": <string or null>,
      "units": <number or null>,
      "amountClaimed": <number or null>,
      "amountApproved": <number or null>,
      "amountWithheld": <number or null>,
      "adjustmentCode": <string or null>,
      "adjustmentReason": <string or null>
    }
  ],
  "notes": <any text not captured above, or null>
}

Extraction rules:
- This is a Medavie Blue Cross / PFSI / IFHP document. Look for EOB, Explication des Prestations, Remittance Advice, or Avis de paiement PFSI headers.
- clientId: the IFHP beneficiary ID (alphanumeric, 8-16 chars). Extract without spaces.
- feeCode: PFSI/IFHP procedure or fee code.
- adjustmentCode: reason code for any reduction (e.g. "02", "07", "NOT COVERED"). Null if fully approved.
- adjustmentReason: human-readable reason for reduction. Null if no reduction.
- For amounts: return numbers only (no $ or spaces). "$1 234.56" → 1234.56
- For dates: convert to YYYY-MM-DD.
- totalWithheld: totalClaimed - totalApproved (compute if not explicit).
- confidence: 0 if this is not a PFSI/IFHP/Medavie EOB, 100 if certain.`;

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

    // Save to remittance_imports with source_type PFSI
    const importRes = await supabase.from('remittance_imports').insert({
      user_id:        user.id,
      report_type:    'PFSI_EOB',
      file_name:      fileName ?? null,
      payment_date:   result.paymentDate ?? null,
      batch_number:   result.chequeNumber ?? null,
      total_approved: result.totalApproved ?? null,
      total_withheld: result.totalWithheld ?? null,
      net_payment:    result.netPayment ?? null,
      raw_extract:    result,
      status:         'pending',
    }).select('id').single();

    if (importRes.error || !importRes.data) {
      return NextResponse.json({ error: 'Failed to save import' }, { status: 500 });
    }

    const importId = importRes.data.id;
    const lines = (result.claims ?? []) as Array<{
      claimNumber?: string; clientId?: string; patientName?: string;
      serviceDate?: string; feeCode?: string; units?: number;
      amountClaimed?: number; amountApproved?: number; amountWithheld?: number;
      adjustmentCode?: string; adjustmentReason?: string;
    }>;

    let matchedCount = 0;
    const lineRows = [];

    for (const line of lines) {
      let matchedId: string | null = null;

      // Match by invoice_number / claim_number
      if (line.claimNumber) {
        const { data: m } = await supabase
          .from('pfsi_claims')
          .select('id')
          .eq('user_id', user.id)
          .or(`claim_number.eq.${line.claimNumber},invoice_number.eq.${line.claimNumber}`)
          .maybeSingle();
        matchedId = m?.id ?? null;
      }

      // Fallback: match by client_id + service date
      if (!matchedId && line.clientId && line.serviceDate) {
        const cleanId = (line.clientId ?? '').replace(/\s+/g, '');
        const { data: m } = await supabase
          .from('pfsi_claims')
          .select('id')
          .eq('user_id', user.id)
          .ilike('client_id', `%${cleanId}%`)
          .maybeSingle();
        matchedId = m?.id ?? null;
      }

      if (matchedId) matchedCount++;

      lineRows.push({
        import_id:        importId,
        user_id:          user.id,
        claim_number:     line.claimNumber ?? null,
        matched_claim_id: matchedId,
        patient_ramq:     (line.clientId ?? '').replace(/\s+/g, '') || null,
        service_date:     line.serviceDate ?? null,
        act_code:         line.feeCode ?? null,
        amount_claimed:   line.amountClaimed ?? null,
        amount_approved:  line.amountApproved ?? null,
        amount_withheld:  line.amountWithheld ?? null,
        reduction_code:   line.adjustmentCode ?? null,
        reduction_reason: line.adjustmentReason ?? null,
      });
    }

    if (lineRows.length > 0) {
      await supabase.from('remittance_lines').insert(lineRows);
    }

    await supabase.from('remittance_imports').update({
      applied_count:   matchedCount,
      unmatched_count: lines.length - matchedCount,
    }).eq('id', importId);

    await logAuditTrail(
      { table_name: 'remittance_imports', record_id: importId, action: 'INSERT',
        reason: `PFSI EOB import: ${lines.length} lignes, ${matchedCount} liées — image rejetée` },
      request
    );

    return NextResponse.json({
      importId, confidence: result.confidence,
      paymentDate: result.paymentDate, chequeNumber: result.chequeNumber,
      totalApproved: result.totalApproved, totalWithheld: result.totalWithheld,
      netPayment: result.netPayment, claimsFound: lines.length, matchedCount,
      lines: lineRows.map((l, i) => ({ ...l, matched: !!l.matched_claim_id, lineIndex: i })),
    });
  } catch (error: unknown) {
    console.error('PFSI remittance OCR error:', error);
    return NextResponse.json({ error: (error as Error)?.message ?? 'Processing failed' }, { status: 500 });
  }
}
