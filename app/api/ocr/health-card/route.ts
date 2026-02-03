import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { logAuditTrail } from '@/lib/compliance/audit-middleware';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `You are analyzing a Quebec RAMQ health card (carte d'assurance maladie du Québec).
Extract the following fields and return ONLY a valid JSON object — no markdown, no explanation.

{
  "fullName": <full name as printed, or null>,
  "memberId": <RAMQ number in format "XXXX 0000 0000 00", or null>,
  "dateOfBirth": <"YYYY-MM-DD" or null>,
  "expiryDate": <expiry as printed e.g. "2027-12", or null>,
  "sex": <"M" | "F" | null>
}

If this is not a Quebec health card, return all fields as null.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await request.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing image data' }, { status: 400 });
    }

    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mediaType = (mediaTypeMatch?.[1] ?? 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
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
      return NextResponse.json({ error: 'Could not parse card data' }, { status: 500 });
    }

    const result = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // Law 25: image discarded immediately — only extracted fields returned
    await logAuditTrail(
      { table_name: 'health_card_ocr', record_id: user.id, action: 'VIEW', reason: 'Health card scanned — image discarded, no PII stored' },
      request
    );

    return NextResponse.json({
      fullName:    result.fullName    || '',
      memberId:    result.memberId    || '',
      expiryDate:  result.expiryDate  || '',
      dateOfBirth: result.dateOfBirth || '',
      sex:         result.sex         || '',
    });
  } catch (error) {
    console.error('Health card OCR error:', error);
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
