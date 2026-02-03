"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { DollarSign, Loader2, ArrowUpRight, ArrowDownLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type TxType = "Revenu" | "Dépense" | "Paiement";
type FilterType = "all" | TxType;

type Tx = {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string;
  status: string;
  source?: string;
};

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

const TYPE_COLOR: Record<TxType, string> = {
  "Revenu":   "text-primary",
  "Paiement": "text-green-400",
  "Dépense":  "text-blue-400",
};

const TYPE_BG: Record<TxType, string> = {
  "Revenu":   "bg-primary/10",
  "Paiement": "bg-green-500/10",
  "Dépense":  "bg-blue-500/10",
};

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: "all",      label: "Tous" },
  { key: "Revenu",   label: "Revenus" },
  { key: "Paiement", label: "Paiements" },
  { key: "Dépense",  label: "Dépenses" },
];

export default function Transactions() {
  const supabase = createClient();
  const router   = useRouter();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterType>("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [claimsRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from("ramq_claims").select("id, patient_name, total_claimed, service_date, status")
          .eq("user_id", user.id).order("service_date", { ascending: false }),
        supabase.from("payments").select("id, amount, payment_date, source, payment_method, reference_number")
          .eq("user_id", user.id).order("payment_date", { ascending: false }),
        supabase.from("expenses").select("id, description, amount, expense_date, category")
          .eq("user_id", user.id).order("expense_date", { ascending: false }),
      ]);

      const combined: Tx[] = [
        ...(claimsRes.data || []).map(c => ({
          id:          `claim-${c.id}`,
          type:        "Revenu" as const,
          description: `Réclamation RAMQ — ${c.patient_name || "—"}`,
          amount:      c.total_claimed || 0,
          date:        c.service_date,
          status:      c.status,
        })),
        ...(paymentsRes.data || []).map(p => ({
          id:          `pay-${p.id}`,
          type:        "Paiement" as const,
          description: `Paiement reçu${p.source ? ` (${p.source})` : ""}${p.reference_number ? ` — ${p.reference_number}` : ""}`,
          amount:      p.amount || 0,
          date:        p.payment_date,
          status:      "completed",
          source:      p.payment_method,
        })),
        ...(expensesRes.data || []).map(e => ({
          id:          `exp-${e.id}`,
          type:        "Dépense" as const,
          description: `${e.description || "—"}${e.category ? ` (${e.category})` : ""}`,
          amount:      e.amount || 0,
          date:        e.expense_date,
          status:      "completed",
        })),
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      setTransactions(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const visible  = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
  const totalIn  = transactions.filter(t => t.type !== "Dépense").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === "Dépense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-7xl bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-6">

        {/* Watermark */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <DollarSign size={400} className="text-primary" />
        </div>

        {/* Header */}
        <div className="relative z-10 m-4 sm:m-6 mb-0 p-4 sm:p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter leading-none">Transactions</h1>
            <p className="text-xs text-white/30 mt-0.5">{transactions.length} entrée{transactions.length !== 1 ? "s" : ""} au total</p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-9 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Button>
          </Link>
        </div>

        {/* Summary stats */}
        <div className="relative z-10 mx-4 sm:mx-6 grid grid-cols-2 gap-3">
          <div className="bg-black/40 border border-green-500/20 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3">
            <ArrowDownLeft className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-[9px] uppercase font-bold text-white/30">Total entrant</p>
              <p className="text-xl font-black text-green-400">${totalIn.toFixed(2)}</p>
              <p className="text-[10px] text-white/20">Réclamations + Paiements</p>
            </div>
          </div>
          <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3">
            <ArrowUpRight className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-[9px] uppercase font-bold text-white/30">Total sortant</p>
              <p className="text-xl font-black text-blue-400">${totalOut.toFixed(2)}</p>
              <p className="text-[10px] text-white/20">Dépenses</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="relative z-10 mx-4 sm:mx-6 flex gap-1 bg-black/40 border border-white/10 rounded-2xl p-1">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === key
                  ? "bg-white/10 text-primary"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="relative z-10 mx-4 sm:mx-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">
              Aucune transaction trouvée.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((tx) => (
                <div key={tx.id} className="bg-black/40 border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_BG[tx.type]}`}>
                      <DollarSign className={`w-4 h-4 ${TYPE_COLOR[tx.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/30">{fmtDate(tx.date)}</span>
                        <span className="text-white/15">·</span>
                        <span className={`text-[10px] font-bold uppercase ${TYPE_COLOR[tx.type]}`}>{tx.type}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-base ${TYPE_COLOR[tx.type]}`}>
                        {tx.type === "Dépense" ? "−" : "+"}${tx.amount.toFixed(2)}
                      </p>
                      <span className={`text-[9px] uppercase font-bold ${
                        tx.status === "completed" || tx.status === "paid" ? "text-green-400/60" : "text-blue-400/60"
                      }`}>
                        {tx.status === "completed" ? "Complété" : tx.status === "paid" ? "Payé" : tx.status === "draft" ? "Brouillon" : tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
