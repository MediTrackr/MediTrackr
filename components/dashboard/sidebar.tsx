"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScanText, FilePlus, Eye, CreditCard, QrCode, ChevronDown, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const T = {
  fr: {
    quickActions: "Actions rapides",
    scanReceipt: "Scanner carte / reçu / ID",
    payment: "Paiement",
    stripePayment: "Paiement Stripe",
    importQr: "Importer un code QR",
    management: "Gestion",
    invoices: "Factures",
    payments: "Paiements",
    budget: "Budget",
    dailyBatch: "Lot du jour",
    systemStatus: "État du système",
    ocrReady: "Prêt",
    ramqOnline: "En ligne",
  },
  en: {
    quickActions: "Quick actions",
    scanReceipt: "Scan card / receipt / ID",
    payment: "Payment",
    stripePayment: "Stripe payment",
    importQr: "Import a QR code",
    management: "Management",
    invoices: "Invoices",
    payments: "Payments",
    budget: "Budget",
    dailyBatch: "Today's batch",
    systemStatus: "System status",
    ocrReady: "Ready",
    ramqOnline: "Online",
  },
};

export default function Sidebar({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const supabase = createClient();
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const [draftCount, setDraftCount] = useState(0);
  const t = T[lang];

  useEffect(() => {
    async function fetchDraftCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ramq, federal, outProv, diplo] = await Promise.all([
        supabase.from("ramq_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("federal_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("out_of_province_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("diplomatic_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
      ]);

      setDraftCount(
        (ramq.count || 0) + (federal.count || 0) + (outProv.count || 0) + (diplo.count || 0)
      );
    }
    fetchDraftCount();
  }, []);

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="card-medical p-4 shadow-cyan space-y-2">
        <h3 className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-4">{t.quickActions}</h3>
        <Link href="/dashboard/scan" className="block">
          <Button variant="default" className="w-full justify-start gap-3 shadow-cyan bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
            <ScanText className="w-4 h-4" /> {t.scanReceipt}
          </Button>
        </Link>
      </div>

      <div className="card-medical p-4 shadow-green space-y-3">
        <h3 className="text-xs font-bold text-green-400/50 uppercase tracking-widest mb-2">{t.payment}</h3>
        <Button variant="outline" className="w-full justify-start gap-3 hover:bg-green-500/10 border-green-400/30">
          <CreditCard className="w-4 h-4 text-green-400" /> {t.stripePayment}
        </Button>
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <QrCode className="w-8 h-8 mx-auto mb-2 text-primary/50" />
          <p className="text-xs text-foreground/60">{t.importQr}</p>
        </div>
      </div>

      <div className="card-medical p-4 shadow-cyan space-y-4">
        <button
          onClick={() => setIsManagementOpen(!isManagementOpen)}
          className="w-full flex items-center justify-between text-xs font-bold text-foreground/50 uppercase tracking-widest hover:text-foreground/70 transition-colors"
        >
          <span>{t.management}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isManagementOpen ? "rotate-180" : ""}`} />
        </button>

        {isManagementOpen && (
          <>
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Link href="/dashboard/invoice" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-foreground/80">
                  <FilePlus className="w-4 h-4" /> {t.invoices}
                </Button>
              </Link>
              <Link href="/dashboard/payment" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-green-500/10 text-foreground/80">
                  <CreditCard className="w-4 h-4 text-green-400" /> {t.payments}
                </Button>
              </Link>
              <Link href="/dashboard/budget" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-green-500/10 text-foreground/80">
                  <Eye className="w-4 h-4 text-green-400" /> {t.budget}
                </Button>
              </Link>
              <Link href="/dashboard/batch" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-foreground/80 relative">
                  <Send className="w-4 h-4 text-primary" />
                  {t.dailyBatch}
                  {draftCount > 0 && (
                    <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-primary text-black text-[10px] font-black">
                      {draftCount > 99 ? "99+" : draftCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>

          </>
        )}
      </div>

      <div className="card-medical p-4 shadow-cyan">
        <h3 className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-2">{t.systemStatus}</h3>
        <p className="text-[10px] opacity-60">OCR : <span className="text-green-400">{t.ocrReady}</span></p>
        <p className="text-[10px] opacity-60">RAMQ : <span className="text-green-400">{t.ramqOnline}</span></p>
      </div>
    </div>
  );
}
