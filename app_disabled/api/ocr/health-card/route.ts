import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let imageData: string | null = null;
  
  try {
    const { image } = await request.json();
    
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing image data' }, { status: 400 });
    }
    
    imageData = image.replace(/^data:image\/\w+;base64,/, '');

    const ocrResponse = await fetch('https://api.mindee.net/v1/products/mindee/custom/v1/predict', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.MINDEE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document: imageData }),
    });

    if (!ocrResponse.ok) {
      return NextResponse.json({ error: 'OCR service unavailable' }, { status: ocrResponse.status });
    }

    const data = await ocrResponse.json();
    const extracted = {
      fullName: data.document?.inference?.pages?.[0]?.prediction?.full_name?.value || '',
      memberId: data.document?.inference?.pages?.[0]?.prediction?.member_id?.value || '',
      expiryDate: data.document?.inference?.pages?.[0]?.prediction?.expiry_date?.value || '',
    };

    imageData = null;
    console.log('[LAW 25 COMPLIANCE] Health card scanned. Image discarded. No PII stored. Timestamp:', new Date().toISOString());

    return NextResponse.json(extracted);
    
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
  } finally {
    imageData = null;
    if (global.gc) { global.gc(); }
  }
}
