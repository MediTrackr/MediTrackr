"use client";
import Link from "next/link";
import { ArrowLeft, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartScanner from "@/components/SmartScanner";

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scan className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-black text-primary uppercase italic tracking-tighter leading-none">
                Scanner intelligent
              </h1>
              <p className="text-[10px] text-white/30 mt-0.5">
                Carte RAMQ · Assurance · ID · Reçu
              </p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-3 h-9 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Button>
          </Link>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { color: "border-primary/40 text-primary/70", label: "RAMQ → Facture RAMQ" },
            { color: "border-amber-400/40 text-amber-400/70", label: "Assurance → Choix facturation" },
            { color: "border-blue-400/40 text-blue-400/70", label: "ID → Infos patient" },
            { color: "border-green-400/40 text-green-400/70", label: "Reçu → Dépense" },
          ].map(({ color, label }) => (
            <span key={label} className={`text-[9px] font-bold uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}>
              {label}
            </span>
          ))}
        </div>

        <SmartScanner standalone />

        <p className="text-center text-[10px] text-white/15 mt-6">
          L&apos;image n&apos;est jamais stockée — conforme à la Loi 25
        </p>
      </div>
    </div>
  );
}
