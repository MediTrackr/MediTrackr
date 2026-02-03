// =====================================================
// 4. COMPONENT - Expense Receipt Scanner (WITH Storage)
// File: components/ExpenseReceiptScanner.tsx
// =====================================================

"use client";
import React, { useState } from "react";
import { Camera, Upload, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpenseReceiptScannerProps {
  onExpenseCreated: (expense: any) => void;
}

export default function ExpenseReceiptScanner({ onExpenseCreated }: ExpenseReceiptScannerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccess(false);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64 = reader.result as string;

      try {
        const response = await fetch('/api/ocr/expense-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();
        
        if (data.success) {
          onExpenseCreated(data.expense);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError('Failed to process receipt');
        }
      } catch (error) {
        console.error('Receipt scan failed:', error);
        setError('Failed to scan receipt. Please try again.');
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div className="card-medical p-6 border-l-4 border-orange-400">
      <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4">
        Scan Expense Receipt
      </h3>
      
      <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-orange-400/50 transition-all text-center">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={handleScan}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={loading}
        />
        
        {loading ? (
          <div className="animate-pulse">
            <Upload className="mx-auto w-12 h-12 mb-2 text-orange-400 animate-bounce" />
            <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
              Processing Receipt...
            </p>
          </div>
        ) : success ? (
          <div>
            <Check className="mx-auto w-12 h-12 mb-2 text-green-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-green-400">
              Expense Saved!
            </p>
          </div>
        ) : error ? (
          <div>
            <X className="mx-auto w-12 h-12 mb-2 text-red-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-red-400">
              {error}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-white/60"
              onClick={() => setError(null)}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div>
            <Camera className="mx-auto w-12 h-12 mb-2 text-white/20 group-hover:text-orange-400/50 transition-colors" />
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Scan Receipt to Create Expense
            </p>
            <p className="text-[10px] text-white/20 mt-2">
              Receipt will be saved and attached to expense record
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
