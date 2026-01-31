"use client";
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Home, FileText, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice');

  return (
    <div className="h-screen bg-black flex items-center justify-center p-4 font-sans selection:bg-primary/30">
      {/* WINDOW FRAME: Standard Meditrackr Double-Border Glassmorphism */}
      <div className="w-full max-w-md bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_80px_rgba(255,165,0,0.1)] overflow-hidden flex flex-col p-10 text-center">
        
        {/* LOGO SUBTLE OVERLAY */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileText size={120} className="text-primary" />
        </div>

        {/* STATUS ICON */}
        <div className="flex justify-center mb-8">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
             <CheckCircle2 className="relative w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(255,165,0,0.5)]" />
          </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-4 mb-10 relative z-10">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
            Thank You
          </h1>
          <div className="h-1 w-12 bg-primary mx-auto rounded-full" />
          
          <div className="pt-2">
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              Your payment has been successfully processed and verified. 
              We appreciate your trust in our medical services.
            </p>
            <p className="text-white/40 text-[11px] mt-4 leading-relaxed italic">
              A formal invoice and digital receipt have been dispatched to your registered email address.
            </p>
          </div>
        </div>

        {/* ACTION AREA */}
        <div className="space-y-4 w-full relative z-10">
          <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <span className="text-[9px] uppercase font-bold text-primary tracking-[0.2em]">Transaction Reference</span>
            <span className="text-xs font-mono text-white/60">{invoiceId ? `INV-${invoiceId.slice(0,8).toUpperCase()}` : 'ON-DEMAND-PAYMENT'}</span>
          </div>

          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-[0_0_20px_rgba(255,165,0,0.3)] transition-all active:scale-95">
            <Link href="/dashboard" className="flex items-center justify-center">
              <Home className="w-5 h-5 mr-3" /> Return to Dashboard
            </Link>
          </Button>
        </div>

        {/* INFRASTRUCTURE FOOTER */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-white/20">
          <Heart className="w-3 h-3 fill-current text-primary/40" />
          <span className="text-[9px] font-bold uppercase tracking-[0.25em]">Meditrackr Security Protocol</span>
        </div>
      </div>
    </div>
  );
}
