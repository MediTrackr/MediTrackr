import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logAuditTrail } from '@/lib/compliance/audit-middleware';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await request.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing image data' }, { status: 400 });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const formData = new FormData();
    formData.append('document', new Blob([buffer], { type: 'image/jpeg' }), 'receipt.jpg');

    const ocrResponse = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.MINDEE_API_KEY}` },
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('Mindee API Error:', errorText);
      return NextResponse.json({ error: 'OCR service unavailable' }, { status: ocrResponse.status });
    }

    const ocrData = await ocrResponse.json();
    const prediction = ocrData.document?.inference?.pages?.[0]?.prediction;

    const expenseData = {
      vendor: prediction?.supplier_name?.value || '',
      amount: parseFloat(prediction?.total_amount?.value || '0'),
      date: prediction?.date?.value || new Date().toISOString().split('T')[0],
      category: prediction?.category?.value || 'Other',
      description: prediction?.description?.value || '',
    };

    const fileName = `receipts/${user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(fileName);

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

    await logAuditTrail(
      { table_name: 'expenses', record_id: expense.id, action: 'INSERT', reason: 'Expense created via OCR scan' },
      request
    );

    return NextResponse.json({ success: true, expense, receiptUrl: publicUrl });
  } catch (error) {
    console.error('Expense OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process expense receipt' }, { status: 500 });
  }
}
