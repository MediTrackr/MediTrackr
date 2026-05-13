"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, Wallet, Search, Calendar, Tag, MapPin,
  CheckCircle2, Clock, DollarSign, CreditCard, Banknote, Building2, FileCheck,
} from "lucide-react";

type SourceFilter = "all" | "pending" | "received";
type GroupBy = "date" | "method" | "source";

const METHOD_META: Record<string, { label_fr: string; label_en: string; color: string; icon: React.ReactNode }> = {
  cash:          { label_fr: "Comptant",       label_en: "Cash",          color: "text-green-400",  icon: <Banknote className="w-3.5 h-3.5" /> },
  check:         { label_fr: "Chèque",         label_en: "Check",         color: "text-yellow-400", icon: <FileCheck className="w-3.5 h-3.5" /> },
  credit_card:   { label_fr: "Carte crédit",   label_en: "Credit card",   color: "text-blue-400",   icon: <CreditCard className="w-3.5 h-3.5" /> },
  debit_card:    { label_fr: "Carte débit",    label_en: "Debit card",    color: "text-blue-300",   icon: <CreditCard className="w-3.5 h-3.5" /> },
  bank_transfer: { label_fr: "Virement",       label_en: "Bank transfer", color: "text-purple-400", icon: <Building2 className="w-3.5 h-3.5" /> },
  stripe:        { label_fr: "Stripe",         label_en: "Stripe",        color: "text-indigo-400", icon: <CreditCard className="w-3.5 h-3.5" /> },
  ramq:          { label_fr: "RAMQ",           label_en: "RAMQ",          color: "text-primary",    icon: <FileCheck className="w-3.5 h-3.5" /> },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

const T = {
  fr: {
    title: "Paiements",
    countLabel: (n: number) => `${n} paiement${n !== 1 ? "s" : ""} enregistré${n !== 1 ? "s" : ""}`,
    record: "Enregistrer",
    back: "Retour",
    stats: { total: "Total reçu", month: "Ce mois", outstanding: "À encaisser", pending: "Factures ouv." },
    tabs: { all: "Tous les paiements", pending: "Factures ouvertes" },
    groupBy: { date: "Date", method: "Mode", source: "Source" },
    searchAll: "Rechercher source, référence...",
    searchPending: "Rechercher patient, numéro de facture...",
    noResult: "Aucun résultat",
    noPending: "Aucune facture en attente",
    noPayments: "Aucun paiement enregistré",
    recordPayment: "Enregistrer un paiement",
    noDate: "Sans date",
    colMethod: "Mode",
    colAmount: "Montant",
    colDate: "Date",
    colSource: "Source",
    colRef: "Réf.",
    colPatient: "Patient",
    colDue: "À payer",
    colDueDate: "Échéance",
    overdue: "En retard",
    waiting: "En attente",
    overAmt: "Autre",
    statusOverdue: "text-red-400 bg-red-500/10 border-red-500/30",
    statusPending: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  en: {
    title: "Payments",
    countLabel: (n: number) => `${n} payment${n !== 1 ? "s" : ""} recorded`,
    record: "Record",
    back: "Back",
    stats: { total: "Total received", month: "This month", outstanding: "Outstanding", pending: "Open invoices" },
    tabs: { all: "All payments", pending: "Open invoices" },
    groupBy: { date: "Date", method: "Method", source: "Source" },
    searchAll: "Search source, reference...",
    searchPending: "Search patient, invoice number...",
    noResult: "No results",
    noPending: "No pending invoices",
    noPayments: "No payments recorded",
    recordPayment: "Record a payment",
    noDate: "No date",
    colMethod: "Method",
    colAmount: "Amount",
    colDate: "Date",
    colSource: "Source",
    colRef: "Ref.",
    colPatient: "Patient",
    colDue: "Due",
    colDueDate: "Due date",
    overdue: "Overdue",
    waiting: "Pending",
    overAmt: "Other",
    statusOverdue: "text-red-400 bg-red-500/10 border-red-500/30",
    statusPending: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
} as const;

interface Payment {
  id: string;
  payment_date?: string | null;
  payment_method?: string;
  source?: string;
  amount?: number;
  reference_number?: string;
  invoice_id?: string;
  notes?: string;
}

interface PendingInvoice {
  id: string;
  invoice_number?: string;
  patient_name?: string;
  total_amount?: number;
  amount_paid?: number;
  due_date?: string | null;
}

export default function ViewPaymentsPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [lang] = useLang();
  const t = T[lang];

  const getMethodLabel = (method: string) => {
    const m = METHOD_META[method];
    if (!m) return method || t.overAmt;
    return lang === "fr" ? m.label_fr : m.label_en;
  };

  const [payments, setPayments]   = useState<Payment[]>([]);
  const [pendingInvs, setPending] = useState<PendingInvoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<SourceFilter>("all");
  const [groupBy, setGroupBy]     = useState<GroupBy>("date");
  const [search, setSearch]       = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: pData }, { data: iData }] = await Promise.all([
        supabase.from("payments").select("*").eq("user_id", user.id).order("payment_date", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, patient_name, total_amount, amount_paid, due_date, status")
          .eq("user_id", user.id).in("status", ["pending", "overdue"]),
      ]);

      if (pData) setPayments(pData);
      if (iData) setPending(iData);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total    = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const thisMonth = payments.filter(p => {
      if (!p.payment_date) return false;
      const d = new Date(p.payment_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding = pendingInvs.reduce((s, i) => s + ((i.total_amount || 0) - (i.amount_paid || 0)), 0);
    return { total, thisMonth, outstanding, pendingCount: pendingInvs.length };
  }, [payments, pendingInvs]);

  const filtered = useMemo(() => {
    let list = payments;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.source?.toLowerCase().includes(q) ||
        p.reference_number?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        getMethodLabel(p.payment_method ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, search, lang]);

  const filteredPending = useMemo(() => {
    if (!search.trim()) return pendingInvs;
    const q = search.toLowerCase();
    return pendingInvs.filter(inv =>
      inv.patient_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q)
    );
  }, [pendingInvs, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Payment[]>();
    filtered.forEach(p => {
      let key: string;
      if (groupBy === "date") key = p.payment_date ? new Date(p.payment_date).toLocaleString("fr-CA", { month: "long", year: "numeric" }) : t.noDate;
      else if (groupBy === "method") key = getMethodLabel(p.payment_method ?? "");
      else key = p.source || (lang === "fr" ? "Source inconnue" : "Unknown source");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries());
  }, [filtered, groupBy, lang]);

  const methodTotals = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const k = p.payment_method || "other";
      map[k] = (map[k] || 0) + (p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-7xl bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-6">

        {/* Watermark */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <Wallet size={400} className="text-green-400" />
        </div>

        {/* Header */}
        <div className="relative z-10 m-4 sm:m-6 mb-0 p-4 sm:p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-green-400 uppercase italic tracking-tighter leading-none">{t.title}</h1>
            <p className="text-xs text-white/30 mt-0.5">{t.countLabel(payments.length)}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/payment/new">
              <Button className="gap-2 bg-green-500 text-black rounded-xl px-4 h-9 text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> {t.record}
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-9 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 mx-4 sm:mx-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t.stats.total,       value: `$${stats.total.toFixed(2)}`,       color: "text-green-400",  border: "border-green-500/20" },
            { label: t.stats.month,       value: `$${stats.thisMonth.toFixed(2)}`,   color: "text-primary",    border: "border-primary/20" },
            { label: t.stats.outstanding, value: `$${stats.outstanding.toFixed(2)}`, color: "text-blue-400",   border: "border-blue-500/20" },
            { label: t.stats.pending,     value: stats.pendingCount,                  color: "text-red-400",    border: "border-red-500/20" },
          ].map(s => (
            <div key={s.label} className={`bg-black/40 border ${s.border} rounded-2xl p-4 backdrop-blur-md`}>
              <p className="text-[9px] uppercase font-bold text-white/30 mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Method breakdown */}
        {methodTotals.length > 0 && (
          <div className="relative z-10 mx-4 sm:mx-6 flex gap-2 overflow-x-auto pb-1">
            {methodTotals.map(([method, amt]) => {
              const meta = METHOD_META[method] ?? { label_fr: method, label_en: method, color: "text-white/40", icon: <DollarSign className="w-3.5 h-3.5" /> };
              const label = lang === "fr" ? meta.label_fr : meta.label_en;
              return (
                <div key={method} className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-xl px-3 py-2 whitespace-nowrap shrink-0">
                  <span className={meta.color}>{meta.icon}</span>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/25">{label}</p>
                    <p className={`text-sm font-black ${meta.color}`}>${amt.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="relative z-10 mx-4 sm:mx-6 flex gap-1 bg-black/40 border border-white/10 rounded-2xl p-1">
          {([
            ["all",     t.tabs.all,     <CheckCircle2 key="a" className="w-3.5 h-3.5" />, "text-green-400"],
            ["pending", t.tabs.pending, <Clock key="p" className="w-3.5 h-3.5" />,        "text-blue-400"],
          ] as [SourceFilter, string, React.ReactNode, string][]).map(([key, lbl, icon, color]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === key ? `bg-white/10 ${color}` : "text-white/30 hover:text-white/50"
              }`}
            >
              {icon}{lbl}
              {key === "pending" && stats.pendingCount > 0 && (
                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {stats.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative z-10 mx-4 sm:mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === "pending" ? t.searchPending : t.searchAll}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40"
            />
          </div>
        </div>

        {/* Pending invoices view */}
        {tab === "pending" && (
          <div className="relative z-10 mx-4 sm:mx-6 flex flex-col gap-2">
            {filteredPending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm">{search.trim() ? t.noResult : t.noPending}</p>
              </div>
            ) : (
              filteredPending.map(inv => {
                const outstanding = (inv.total_amount || 0) - (inv.amount_paid || 0);
                const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
                return (
                  <div key={inv.id} className={`bg-black/40 border rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-4 ${isOverdue ? "border-red-500/30" : "border-blue-500/20"}`}>
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colPatient}</p>
                      <p className="text-sm font-bold text-white">{inv.patient_name || "—"}</p>
                      <p className="text-[10px] text-white/30">{inv.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colDue}</p>
                      <p className={`text-base font-black ${isOverdue ? "text-red-400" : "text-blue-400"}`}>${outstanding.toFixed(2)}</p>
                    </div>
                    {inv.due_date && (
                      <div>
                        <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colDueDate}</p>
                        <p className={`text-sm ${isOverdue ? "text-red-400" : "text-white/60"}`}>{fmtDate(inv.due_date)}</p>
                      </div>
                    )}
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase ${isOverdue ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-blue-400 bg-blue-500/10 border-blue-500/30"}`}>
                      {isOverdue ? t.overdue : t.waiting}
                    </span>
                    <Link href="/dashboard/payment/new">
                      <Button className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs h-8 px-3 hover:bg-green-500/30">
                        {t.recordPayment}
                      </Button>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Received payments view */}
        {tab !== "pending" && (
          <>
            {/* Group by */}
            <div className="relative z-10 mx-4 sm:mx-6 flex justify-end">
              <div className="flex gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                {([["date",   <Calendar key="c" className="w-3.5 h-3.5" />, t.groupBy.date],
                   ["method", <Tag key="t" className="w-3.5 h-3.5" />, t.groupBy.method],
                   ["source", <MapPin key="m" className="w-3.5 h-3.5" />, t.groupBy.source]] as [GroupBy, React.ReactNode, string][]).map(([key, icon, lbl]) => (
                  <button
                    key={key}
                    onClick={() => setGroupBy(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      groupBy === key ? "bg-green-500 text-black" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {icon}{lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative z-10 mx-4 sm:mx-6 flex flex-col gap-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <DollarSign className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-sm">{t.noPayments}</p>
                  <Link href="/dashboard/payment/new">
                    <Button className="bg-green-500 text-black mt-4 text-xs">{t.recordPayment}</Button>
                  </Link>
                </div>
              ) : (
                groups.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] uppercase font-black tracking-widest text-white/25">{groupLabel}</span>
                      <span className="text-[9px] text-green-400/50 font-bold">
                        ${items.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2)}
                      </span>
                    </div>

                    {items.map(p => {
                      const meta = METHOD_META[p.payment_method ?? ""] ?? { label_fr: p.payment_method || "—", label_en: p.payment_method || "—", color: "text-white/40", icon: <DollarSign className="w-3.5 h-3.5" /> };
                      const methodLabel = lang === "fr" ? meta.label_fr : meta.label_en;
                      return (
                        <div
                          key={p.id}
                          className="bg-black/40 border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Method icon + label */}
                            <div className={`flex items-center gap-2 min-w-[100px] ${meta.color}`}>
                              {meta.icon}
                              <div>
                                <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colMethod}</p>
                                <p className="text-xs font-bold">{methodLabel}</p>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="min-w-[90px]">
                              <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colAmount}</p>
                              <p className="text-lg font-black text-green-400">${(p.amount || 0).toFixed(2)}</p>
                            </div>

                            {/* Date */}
                            <div className="min-w-[90px]">
                              <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colDate}</p>
                              <p className="text-sm text-white/70">{fmtDate(p.payment_date)}</p>
                            </div>

                            {/* Source */}
                            {p.source && (
                              <div className="flex-1 min-w-[100px]">
                                <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colSource}</p>
                                <p className="text-sm text-white/60">{p.source}</p>
                              </div>
                            )}

                            {/* Ref */}
                            {p.reference_number && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">{t.colRef}</p>
                                <p className="text-xs font-mono text-white/40">{p.reference_number}</p>
                              </div>
                            )}
                          </div>

                          {p.notes && (
                            <p className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/25 italic">{p.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
