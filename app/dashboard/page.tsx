"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Sidebar from "@/components/dashboard/sidebar";
import StatCard from "@/components/ui/stat-card";
import { 
  DollarSign, 
  Wallet, 
  Clock, 
  ArrowDownToLine, 
  FilePlus, 
  LayoutList, 
  BarChart3, 
  Send 
} from "lucide-react";
import HangingClaimsWidget, { HangingClaim } from "@/components/HangingClaimsWidget";
import Link from "next/link";

interface RAMQStat {
  total_claimed: number | null;
  amount_received: number | null;
}

const ACTION_ICONS = [Send, FilePlus, LayoutList, DollarSign, ArrowDownToLine, BarChart3];

const T = {
  fr: {
    subtitle: "Résumé de facturation et remboursements partenaires",
    statBilled: "Montant facturé",
    statReceived: "Montant perçu",
    statPending: "En attente",
    actions: [
      { href: "/dashboard/batch",           label: "Lot du jour",             sub: "Réviser et soumettre les réclamations" },
      { href: "/dashboard/invoice/new",      label: "Nouvelle facture",        sub: "Créer une réclamation ou facture" },
      { href: "/dashboard/invoice",          label: "Factures",                sub: "Historique et statuts" },
      { href: "/dashboard/payment/new",      label: "Enregistrer un paiement",  sub: "Saisir un paiement reçu" },
      { href: "/dashboard/expenses/upload",  label: "Importer un rapport",     sub: "CSV / PDF partenaire" },
      { href: "/dashboard/budget",           label: "Budget",                  sub: "Planification financière" },
    ],
  },
  en: {
    subtitle: "Billing summary and partner reimbursements",
    statBilled: "Amount billed",
    statReceived: "Amount received",
    statPending: "Pending",
    actions: [
      { href: "/dashboard/batch",           label: "Today's batch",       sub: "Review and submit claims" },
      { href: "/dashboard/invoice/new",      label: "New invoice",         sub: "Create a claim or invoice" },
      { href: "/dashboard/invoice",          label: "Invoices",            sub: "History and statuses" },
      { href: "/dashboard/payment/new",      label: "Record a payment",    sub: "Enter a received payment" },
      { href: "/dashboard/expenses/upload",  label: "Import a report",     sub: "CSV / PDF partner" },
      { href: "/dashboard/budget",           label: "Budget",              sub: "Financial planning" },
    ],
  },
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [profile, setProfile] = useState({ prefix: "", name: "" });
  const [stats, setStats] = useState({ amountBilled: 0, amountPerceived: 0, pendingPayment: 0 });
  const [hangingClaims, setHangingClaims] = useState<HangingClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = document.cookie.split("; ").find(r => r.startsWith("lang="))?.split("=")[1];
    if (stored === "en") setLang("en");
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [profileRes, ramqRes, hangingRes] = await Promise.all([
        supabase.from("profiles").select("prefix, first_name, last_name").eq("id", user.id).maybeSingle(),
        supabase.from("ramq_claims").select("total_claimed, amount_received").eq("user_id", user.id),
        supabase.from("hanging_claims").select("*").eq("user_id", user.id).order("days_outstanding", { ascending: false }),
      ]);

      if (profileRes.data) {
        setProfile({
          prefix: profileRes.data.prefix ?? "",
          name: [profileRes.data.first_name, profileRes.data.last_name].filter(Boolean).join(" "),
        });
      }

      if (ramqRes.data) {
        const rows = ramqRes.data as RAMQStat[];
        const totalBilled = rows.reduce((sum, c) => sum + (Number(c.total_claimed) || 0), 0);
        const totalPaid = rows.reduce((sum, c) => sum + (Number(c.amount_received) || 0), 0);
        setStats({ 
          amountBilled: totalBilled, 
          amountPerceived: totalPaid, 
          pendingPayment: totalBilled - totalPaid 
        });
      }

      if (hangingRes.data) setHangingClaims(hangingRes.data);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fmt = (n: number) => `$${n.toLocaleString("fr-CA")}`;
  const t = T[lang];

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        
        {/* Background Graphic */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-primary"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 flex flex-col h-full p-6 space-y-6">
          <DashboardHeader lang={lang} onLangChange={setLang} />

          <div className="text-center p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl">
            <h1 className="text-3xl font-bold text-primary text-glow">
              {profile.prefix && profile.name ? `${profile.prefix} ${profile.name}` : profile.name || "—"}
            </h1>
            <p className="text-sm opacity-60 mt-1">{t.subtitle}</p>
          </div>

          <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <Sidebar lang={lang} />

                <div className="lg:col-span-3 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title={t.statBilled} value={loading ? "…" : fmt(stats.amountBilled)} icon={DollarSign} className="shadow-cyan" />
                    <StatCard title={t.statReceived} value={loading ? "…" : fmt(stats.amountPerceived)} icon={Wallet} className="shadow-green" />
                    <StatCard title={t.statPending} value={loading ? "…" : fmt(stats.pendingPayment)} icon={Clock} className="shadow-cyan" />
                  </div>

                  <HangingClaimsWidget claims={hangingClaims} loading={loading} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {t.actions.map(({ href, label, sub }, i) => {
                      const Icon = ACTION_ICONS[i];
                      return (
                        <Link key={href} href={href}>
                          <div className="card-medical p-6 flex items-center gap-4 shadow-cyan cursor-pointer hover:border-primary/40 transition-all group">
                            <Icon className="w-8 h-8 text-primary shrink-0" />
                            <div>
                              <h4 className="font-bold text-sm">{label}</h4>
                              <p className="text-[10px] opacity-50">{sub}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}