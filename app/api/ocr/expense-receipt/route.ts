// =====================================================
// 2. API ROUTE - Expense Receipt OCR (WITH Storage)
// File: app/api/ocr/expense-receipt/route.ts
// =====================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image } = await request.json();
    
    // 🛡️ Guard: Validate image data
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing image data' }, { status: 400 });
    }
    
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // 1. Call OCR API to extract receipt data
    const ocrResponse = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.MINDEE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: base64Image,
      }),
    });

    // 🛡️ Guard: Check API response status
    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('Mindee API Error:', errorText);
      return NextResponse.json({ error: 'OCR service unavailable' }, { status: ocrResponse.status });
    }

    const ocrData = await ocrResponse.json();
    const prediction = ocrData.document?.inference?.pages?.[0]?.prediction;

    // 2. Extract expense details
    const expenseData = {
      vendor: prediction?.supplier_name?.value || '',
      amount: parseFloat(prediction?.total_amount?.value || '0'),
      date: prediction?.date?.value || new Date().toISOString().split('T')[0],
      category: prediction?.category?.value || 'Other',
      description: prediction?.description?.value || '',
    };

    // 3. Upload receipt image to Supabase Storage
    const fileName = `receipts/${user.id}/${Date.now()}.jpg`;
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 4. Get public URL for the receipt
    const { data: { publicUrl } } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(fileName);

    // 5. Create expense record in database
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        vendor: expenseData.vendor,
        amount: expenseData.amount,
        expense_date: expenseData.date,
        category: expenseData.category,
        description: expenseData.description,
        receipt_url: publicUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    return NextResponse.json({
      success: true,
      expense,
      receiptUrl: publicUrl,
    });
  } catch (error) {
    console.error('Expense OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process expense receipt' }, { status: 500 });
  }
}