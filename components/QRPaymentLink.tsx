"use client";
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';

export default function QRPaymentLink({ invoiceId, amount, patientName, patientEmail }: any) {
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch('/api/create-payment-link', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, amount, patientName, patientEmail })
    });
    const data = await res.json();
    setPaymentUrl(data.paymentUrl);
    setLoading(false);
  };

  return (
    <div className="p-6 bg-black/40 border border-white/10 rounded-2xl">
      {!paymentUrl ? (
        <Button onClick={generate} disabled={loading} className="w-full bg-primary text-black font-bold">
          {loading ? 'Generating...' : 'Generate Payment QR'}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
             <QRCodeSVG value={paymentUrl} size={200} />
          </div>
          <p className="text-xs text-primary font-bold uppercase tracking-widest">Scan to Pay CAD ${amount}</p>
        </div>
      )}
    </div>
  );
}
