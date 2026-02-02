// =====================================================
// 3. COMPONENT - Health Card Scanner (Ephemeral)
// File: components/HealthCardScanner.tsx
// =====================================================

"use client";
import React, { useState } from "react";
import { Camera, RefreshCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthCardScannerProps {
  onDataExtracted: (data: { fullName: string; memberId: string; expiryDate: string }) => void;
}

export default function HealthCardScanner({ onDataExtracted }: HealthCardScannerProps) {
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setScanned(false);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64 = reader.result as string;

      try {
        const response = await fetch('/api/ocr/health-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();
        
        if (data.fullName || data.memberId) {
          onDataExtracted(data);
          setScanned(true);
        }
      } catch (error) {
        console.error('OCR Failed:', error);
        alert('Failed to scan health card. Please enter details manually.');
      } finally {
        setLoading(false);
        // Image is garbage collected here - never stored
      }
    };
  };

  return (
    <div className="card-medical p-6 border-l-4 border-primary">
      <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-primary/50 transition-all text-center">
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
            <RefreshCcw className="mx-auto w-12 h-12 mb-2 text-primary animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Extracting Data...
            </p>
          </div>
        ) : scanned ? (
          <div>
            <Check className="mx-auto w-12 h-12 mb-2 text-green-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-green-400">
              Card Scanned Successfully!
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-white/60"
              onClick={() => setScanned(false)}
            >
              Scan Again
            </Button>
          </div>
        ) : (
          <div>
            <Camera className="mx-auto w-12 h-12 mb-2 text-white/20 group-hover:text-primary/50 transition-colors" />
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Scan RAMQ Card to Auto-Fill
            </p>
            <p className="text-[10px] text-white/20 mt-2">
              No data is stored - card details only used to populate form
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
