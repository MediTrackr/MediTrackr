"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, FileText, Search, Calendar, Tag, MapPin,
  CheckCircle2, Clock, AlertCircle, FileX, Eye,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "paid" | "overdue" | "draft";
type GroupBy = "date" | "type" | "place";

const STATUS_TABS: { key: StatusFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "all",     label: "Tous",      icon: <FileText className="w-3.5 h-3.5" />,    color: "text-white/60" },
  { key: "pending", label: "En attente",icon: <Clock className="w-3.5 h-3.5" />,       color: "text-blue-400" },
  { key: "paid",    label: "Payées",    icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400" },
  { key: "overdue", label: "En retard", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-400" },
  { key: "draft",   label: "Brouillon", icon: <FileX className="w-3.5 h-3.5" />,       color: "text-white/30" },
];

const STATUS_STYLE: Record<string, string> = {
  paid:    "text-green-400 bg-green-500/10 border-green-500/30",
  pending: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  overdue: "text-red-400 bg-red-500/10 border-red-500/30",
  draft:   "text-white/30 bg-white/5 border-white/10",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payée", pending: "En attente", overdue: "En retard", draft: "Brouillon",
};

const PARTNER_LABEL: Record<string, string> = {
  ramq:      "RAMQ",
  insurance: "Assurance",
  private:   "Privé",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

function monthKey(d: string | null | undefined) {
  if (!d) return "Sans date";
  return new Date(d).toLocaleString("fr-CA", { month: "long", year: "numeric" });
}

interface Invoice {
  id: string;
  invoice_number?: string;
  patient_name?: string;
  patient_ramq?: string;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number;
  amount_paid?: number;
  status?: string;
  partner_type?: string;
  practice_location?: string;
  notes?: string;
}

function groupInvoices(list: Invoice[], by: GroupBy): [string, Invoice[]][] {
  const map = new Map<string, Invoice[]>();
  list.forEach(inv => {
    let key: string;
    if (by === "date")  key = monthKey(inv.invoice_date);
    else if (by === "type") key = PARTNER_LABEL[inv.partner_type ?? ""] ?? "Non classifié";
    else key = inv.practice_location || "Lieu non précisé";

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(inv);
  });
  return Array.from(map.entries());
}

export default function ViewInvoicesPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState<StatusFilter>("all");
  const [groupBy, setGroupBy]   = useState<GroupBy>("date");
  const [search, setSearch]     = useState("");

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("invoice_date", { ascending: false });
      if (data) setInvoices(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = invoices;
    if (status !== "all") list = list.filter(i => i.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.patient_name?.toLowerCase().includes(q) ||
        i.patient_ramq?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q) ||
        i.partner_type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, status, search]);

  const groups = useMemo(() => groupInvoices(filtered, groupBy), [filtered, groupBy]);

  const stats = useMemo(() => ({
    total:   invoices.length,
    pending: invoices.filter(i => i.status === "pending").length,
    paid:    invoices.filter(i => i.status === "paid").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    billed:  invoices.reduce((s, i) => s + (i.total_amount || 0), 0),
    received:invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount_paid || i.total_amount || 0), 0),
  }), [invoices]);

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-7xl bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-6">

        {/* Watermark */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <FileText size={400} className="text-primary" />
        </div>

        {/* Header */}
        <div className="relative z-10 m-4 sm:m-6 mb-0 p-4 sm:p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter leading-none">Factures</h1>
            <p className="text-xs text-white/30 mt-0.5">{stats.total} facture{stats.total !== 1 ? "s" : ""} au total</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/invoice/new">
              <Button className="gap-2 bg-primary text-black rounded-xl px-4 h-9 text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Nouvelle facture
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-9 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 mx-4 sm:mx-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Facturé",    value: `$${stats.billed.toFixed(2)}`,   color: "text-primary", border: "border-primary/20" },
            { label: "Encaissé",   value: `$${stats.received.toFixed(2)}`, color: "text-green-400", border: "border-green-500/20" },
            { label: "En attente", value: stats.pending,                    color: "text-blue-400", border: "border-blue-500/20" },
            { label: "En retard",  value: stats.overdue,                    color: "text-red-400", border: "border-red-500/20" },
          ].map(s => (
            <div key={s.label} className={`bg-black/40 border ${s.border} rounded-2xl p-4 backdrop-blur-md`}>
              <p className="text-[9px] uppercase font-bold text-white/30 mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="relative z-10 mx-4 sm:mx-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher patient, numéro..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
            />
          </div>

          {/* Group by */}
          <div className="flex gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
            {([["date", <Calendar key="c" className="w-3.5 h-3.5" />, "Date"],
               ["type", <Tag key="t" className="w-3.5 h-3.5" />, "Type"],
               ["place",<MapPin key="m" className="w-3.5 h-3.5" />, "Lieu"]] as [GroupBy, React.ReactNode, string][]).map(([key, icon, lbl]) => (
              <button
                key={key}
                onClick={() => setGroupBy(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  groupBy === key ? "bg-primary text-black" : "text-white/40 hover:text-white/70"
                }`}
              >
                {icon}{lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="relative z-10 mx-4 sm:mx-6 flex gap-1 bg-black/40 border border-white/10 rounded-2xl p-1 overflow-x-auto">
          {STATUS_TABS.map(t => {
            const count = t.key === "all" ? invoices.length : invoices.filter(i => i.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center ${
                  status === t.key
                    ? "bg-white/10 " + t.color
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {t.icon}
                {t.label}
                <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${status === t.key ? "bg-white/10" : "bg-white/5"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="relative z-10 mx-4 sm:mx-6 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Aucune facture trouvée</p>
              <Link href="/dashboard/invoice/new">
                <Button className="bg-primary text-black mt-4 text-xs">Créer une facture</Button>
              </Link>
            </div>
          ) : (
            groups.map(([groupLabel, items]) => (
              <div key={groupLabel} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/25">{groupLabel}</span>
                  <span className="text-[9px] text-white/15">— {items.length} facture{items.length !== 1 ? "s" : ""}</span>
                </div>

                {items.map(inv => {
                  const outstanding = (inv.total_amount || 0) - (inv.amount_paid || 0);
                  return (
                    <div
                      key={inv.id}
                      className="bg-black/40 border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all group"
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Invoice # + type */}
                        <div className="min-w-[100px]">
                          <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Facture</p>
                          <p className="text-sm font-black text-primary">{inv.invoice_number || "—"}</p>
                          <span className="text-[9px] font-bold text-white/30 uppercase">
                            {PARTNER_LABEL[inv.partner_type ?? ""] ?? "Non classifié"}
                          </span>
                        </div>

                        {/* Patient */}
                        <div className="flex-1 min-w-[120px]">
                          <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Patient</p>
                          <p className="text-sm text-white font-medium">{inv.patient_name || "—"}</p>
                          {inv.patient_ramq && (
                            <p className="text-[10px] text-white/30 font-mono">{inv.patient_ramq}</p>
                          )}
                        </div>

                        {/* Date */}
                        <div className="min-w-[90px]">
                          <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Date</p>
                          <p className="text-sm text-white/70">{fmtDate(inv.invoice_date)}</p>
                          {inv.due_date && (
                            <p className="text-[10px] text-white/30">Échéance {fmtDate(inv.due_date)}</p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="min-w-[90px] text-right sm:text-left">
                          <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Montant</p>
                          <p className="text-base font-black text-white">${(inv.total_amount || 0).toFixed(2)}</p>
                          {outstanding > 0 && inv.status !== "draft" && (
                            <p className="text-[10px] text-blue-400/80">Solde ${outstanding.toFixed(2)}</p>
                          )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wide ${STATUS_STYLE[inv.status ?? ""] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                            {STATUS_LABEL[inv.status ?? ""] ?? inv.status ?? "—"}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {inv.notes && (
                        <p className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/25 italic">{inv.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
