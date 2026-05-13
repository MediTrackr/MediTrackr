import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { logAuditTrail } from '@/lib/compliance/audit-middleware';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROMPT = `Analyze this document image and return ONLY a valid JSON object — no markdown, no code blocks, no explanation.

Use this exact structure:
{
  "documentType": "RAMQ_CARD" | "INSURANCE_CARD" | "ID_CARD" | "RECEIPT" | "INVOICE" | "UNKNOWN",
  "confidence": <integer 0-100>,
  "fields": {
    "fullName": <string or null>,
    "memberId": <string or null>,
    "dateOfBirth": <"YYYY-MM-DD" or null>,
    "expiryDate": <string or null>,
    "province": <two-letter CA province code or null>,
    "insurerName": <string or null>,
    "groupNumber": <string or null>,
    "policyNumber": <string or null>,
    "vendor": <string or null>,
    "amount": <number or null>,
    "date": <"YYYY-MM-DD" or null>,
    "description": <string or null>
  },
  "billingRecommendation": "RAMQ" | "PRIVATE_INSURANCE" | "OUT_OF_PROVINCE" | "EXPENSE" | null,
  "detectedInsurer": <string or null>,
  "detectedProvince": <two-letter province or null>
}

Classification rules:
- RAMQ_CARD: Quebec health card — "Régie de l'assurance maladie", "Carte d'assurance maladie", RAMQ logo
- INSURANCE_CARD: Private health/dental/vision insurance card — Sun Life, Manulife, Blue Cross, Desjardins, Great-West, Canada Life, etc.
- ID_CARD: Driver's license, passport, provincial ID — no insurance or health branding
- RECEIPT: Store or service receipt — shows vendor name, line items, taxes, total
- INVOICE: Medical or professional bill/invoice
- UNKNOWN: Cannot determine

billingRecommendation rules:
- RAMQ_CARD AND province = QC → "RAMQ"
- RAMQ_CARD AND province ≠ QC (or unknown) → "OUT_OF_PROVINCE"
- INSURANCE_CARD → "PRIVATE_INSURANCE"
- RECEIPT or INVOICE → "EXPENSE"
- ID_CARD → null (no billing action)

Extract every readable field. For amounts, return a number only (no $ sign).`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'OCR service not configured (missing API key)' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await request.json();
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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return NextResponse.json({ error: 'Could not parse OCR response' }, { status: 500 });
    }

    const result = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // Law 25: image is never stored — only extracted fields returned
    await logAuditTrail(
      { table_name: 'smart_scan_ocr', record_id: user.id, action: 'VIEW', reason: `Smart scan: ${result.documentType} (${result.confidence}% confidence) — image discarded` },
      request
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Smart scan error:', error);
    const msg = error?.message ?? error?.error?.message ?? String(error) ?? 'Scan processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
