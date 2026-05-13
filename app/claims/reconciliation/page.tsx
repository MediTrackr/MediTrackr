"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft, CheckCircle, AlertTriangle, TrendingDown, TrendingUp,
  DollarSign, BarChart3, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShadowEntry {
  id: string;
  claim_id: string | null;
  payment_source: string | null;
  expected_amount: number;
  actual_amount: number | null;
  variance_amount: number | null;
  variance_percentage: number | null;
  discrepancy_reason: string | null;
  resolved: boolean;
  actual_date: string | null;
  expected_date: string;
  calculation_basis: {
    claim_number?: string;
    patient_name?: string;
    service_date?: string;
    status?: string;
  } | null;
}

interface SummaryCards {
  totalExpected: number;
  totalReceived: number;
  totalVariance: number;
  unresolvedCount: number;
  resolvedCount: number;
  shortfallCount: number;
  surplusCount: number;
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const T = {
  fr: {
    title: 'Réconciliation des paiements',
    subtitle: 'Attendus vs reçus · écarts RAMQ',
    loading: 'Chargement…',
    totalClaimed: 'Total réclamé',
    totalReceived: 'Total reçu',
    totalVariance: 'Écart total',
    toResolve: 'À résoudre',
    shortfall: 'Manque à recevoir',
    surplus: 'Surplus',
    balanced: 'Équilibré',
    recoveryRate: 'Taux de récupération',
    claimedLabel: 'Réclamé',
    receivedLabel: 'Reçu',
    filters: { unresolved: (n: number) => `Non résolus (${n})`, resolved: (n: number) => `Résolus (${n})`, all: (n: number) => `Tous (${n})` },
    claimsCount: (n: number) => `${n} réclamation${n !== 1 ? 's' : ''}`,
    reconciledCount: (n: number) => `${n} réconcilié${n !== 1 ? 's' : ''}`,
    deficitCount: (n: number, s: number) => `${n} déficit · ${s} surplus`,
    resolved: 'Résolu',
    deficit: 'Déficit',
    surplusLabel: 'Surplus',
    balancedLabel: 'Équilibré',
    detail: { source: 'Source paiement', expectedDate: 'Date attendue', receivedDate: 'Date reçue', variancePct: 'Écart (%)' },
    discrepancyReason: "Raison de l'écart",
    markResolved: 'Marquer résolu',
    resolving: 'Résolution…',
    claimedShort: 'Réclamé',
    receivedShort: 'Reçu',
    varianceShort: 'Écart',
    empty: {
      unresolved: 'Aucun écart à résoudre — tout est réconcilié',
      resolved: 'Aucune entrée résolue pour l\'instant',
      all: 'Aucune entrée dans le grand livre des paiements',
      hint: 'Les entrées apparaissent automatiquement quand une réclamation est marquée payée ou partielle.',
      ramqLink: 'Aller au centre de commande RAMQ →',
    },
  },
  en: {
    title: 'Payment reconciliation',
    subtitle: 'Expected vs received · RAMQ gaps',
    loading: 'Loading…',
    totalClaimed: 'Total claimed',
    totalReceived: 'Total received',
    totalVariance: 'Total variance',
    toResolve: 'To resolve',
    shortfall: 'Shortfall',
    surplus: 'Surplus',
    balanced: 'Balanced',
    recoveryRate: 'Recovery rate',
    claimedLabel: 'Claimed',
    receivedLabel: 'Received',
    filters: { unresolved: (n: number) => `Unresolved (${n})`, resolved: (n: number) => `Resolved (${n})`, all: (n: number) => `All (${n})` },
    claimsCount: (n: number) => `${n} claim${n !== 1 ? 's' : ''}`,
    reconciledCount: (n: number) => `${n} reconciled`,
    deficitCount: (n: number, s: number) => `${n} deficit · ${s} surplus`,
    resolved: 'Resolved',
    deficit: 'Deficit',
    surplusLabel: 'Surplus',
    balancedLabel: 'Balanced',
    detail: { source: 'Payment source', expectedDate: 'Expected date', receivedDate: 'Received date', variancePct: 'Variance (%)' },
    discrepancyReason: 'Discrepancy reason',
    markResolved: 'Mark resolved',
    resolving: 'Resolving…',
    claimedShort: 'Claimed',
    receivedShort: 'Received',
    varianceShort: 'Gap',
    empty: {
      unresolved: 'No gaps to resolve — everything is reconciled',
      resolved: 'No resolved entries yet',
      all: 'No entries in the payment ledger',
      hint: 'Entries appear automatically when a claim is marked paid or partial.',
      ramqLink: 'Go to RAMQ command center →',
    },
  },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("fr-CA", { minimumFractionDigits: 2 });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" }) : "—";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang] = useLang();
  const t = T[lang];

  const [entries, setEntries] = useState<ShadowEntry[]>([]);
  const [summary, setSummary] = useState<SummaryCards>({
    totalExpected: 0, totalReceived: 0, totalVariance: 0,
    unresolvedCount: 0, resolvedCount: 0, shortfallCount: 0, surplusCount: 0,
  });
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("shadow_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("actual_date", { ascending: false });

    if (!data) { setLoading(false); return; }

    const rows = data as ShadowEntry[];
    setEntries(rows);

    const totalExpected  = rows.reduce((s, r) => s + r.expected_amount, 0);
    const totalReceived  = rows.reduce((s, r) => s + (r.actual_amount ?? 0), 0);
    const totalVariance  = totalReceived - totalExpected;
    const unresolved     = rows.filter(r => !r.resolved);
    const resolved       = rows.filter(r => r.resolved);
    const shortfall      = rows.filter(r => !r.resolved && (r.variance_amount ?? 0) < 0);
    const surplus        = rows.filter(r => !r.resolved && (r.variance_amount ?? 0) > 0);

    setSummary({
      totalExpected,
      totalReceived,
      totalVariance,
      unresolvedCount: unresolved.length,
      resolvedCount:   resolved.length,
      shortfallCount:  shortfall.length,
      surplusCount:    surplus.length,
    });

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resolveEntry = async (id: string) => {
    setResolving(id);
    await supabase
      .from("shadow_ledger")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    await fetchData();
    setResolving(null);
  };

  const filtered = entries.filter(e => {
    if (filter === "unresolved") return !e.resolved;
    if (filter === "resolved")   return  e.resolved;
    return true;
  });

  const varianceColor = (v: number | null) => {
    if (!v || v === 0) return "text-white/40";
    return v < 0 ? "text-red-400" : "text-green-400";
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-6xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-5
                        border-b border-white/8 bg-[#050505]/95 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <Link href="/claims/ramq"
              className="p-2 rounded-xl border border-white/10 hover:border-white/20
                         text-white/40 hover:text-white/70 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white/90 tracking-tight">{t.title}</h1>
              <p className="text-[11px] text-white/30 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-white/10 hover:border-white/20
                       text-white/40 hover:text-white/60 transition-all disabled:opacity-30">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<DollarSign className="w-4 h-4 text-blue-400" />}
              label={t.totalClaimed}
              value={fmt(summary.totalExpected)}
              sub={t.claimsCount(entries.length)}
              border="border-blue-500/20"
            />
            <SummaryCard
              icon={<CheckCircle className="w-4 h-4 text-green-400" />}
              label={t.totalReceived}
              value={fmt(summary.totalReceived)}
              sub={t.reconciledCount(summary.resolvedCount)}
              border="border-green-500/20"
            />
            <SummaryCard
              icon={
                summary.totalVariance < 0
                  ? <TrendingDown className="w-4 h-4 text-red-400" />
                  : <TrendingUp className="w-4 h-4 text-emerald-400" />
              }
              label={t.totalVariance}
              value={fmt(summary.totalVariance)}
              valueClass={summary.totalVariance < 0 ? "text-red-400" : summary.totalVariance > 0 ? "text-emerald-400" : "text-white/70"}
              sub={summary.totalVariance < 0 ? t.shortfall : summary.totalVariance > 0 ? t.surplus : t.balanced}
              border={summary.totalVariance < 0 ? "border-red-500/20" : summary.totalVariance > 0 ? "border-emerald-500/20" : "border-white/10"}
            />
            <SummaryCard
              icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
              label={t.toResolve}
              value={String(summary.unresolvedCount)}
              sub={t.deficitCount(summary.shortfallCount, summary.surplusCount)}
              border="border-yellow-500/20"
            />
          </div>

          {/* Expected vs Received bar */}
          {summary.totalExpected > 0 && (
            <ReconciliationBar
              expected={summary.totalExpected}
              received={summary.totalReceived}
              t={t}
            />
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(["unresolved", "resolved", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f
                    ? "bg-white/10 border-white/20 text-white/80"
                    : "border-white/8 text-white/30 hover:text-white/50 hover:border-white/15"
                }`}
              >
                {f === "unresolved" ? t.filters.unresolved(summary.unresolvedCount)
                  : f === "resolved" ? t.filters.resolved(summary.resolvedCount)
                  : t.filters.all(entries.length)}
              </button>
            ))}
          </div>

          {/* Entry list */}
          {loading ? (
            <div className="text-center py-20 text-white/30 text-sm">{t.loading}</div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} t={t} />
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  expanded={expanded === entry.id}
                  onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  onResolve={() => resolveEntry(entry.id)}
                  resolving={resolving === entry.id}
                  varianceColor={varianceColor}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, sub, border, valueClass = "text-white/90",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  border: string;
  valueClass?: string;
}) {
  return (
    <div className={`rounded-2xl border ${border} bg-black/40 px-5 py-4 space-y-2`}>
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-white/25">{sub}</p>
    </div>
  );
}

function ReconciliationBar({ expected, received, t }: { expected: number; received: number; t: (typeof T)['fr'] | (typeof T)['en'] }) {
  const pct = Math.min((received / expected) * 100, 100);
  const over = received > expected;
  return (
    <div className="rounded-2xl border border-white/8 bg-black/40 px-6 py-4 space-y-3">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" />
          {t.recoveryRate}
        </span>
        <span className={`font-bold text-sm ${over ? "text-emerald-400" : pct < 80 ? "text-red-400" : "text-yellow-400"}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
            over ? "bg-emerald-500" : pct < 80 ? "bg-red-500" : "bg-yellow-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/25">
        <span>{t.claimedLabel} : {fmt(expected)}</span>
        <span>{t.receivedLabel} : {fmt(received)}</span>
      </div>
    </div>
  );
}

function EntryRow({
  entry, expanded, onToggle, onResolve, resolving, varianceColor, t,
}: {
  entry: ShadowEntry;
  expanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  resolving: boolean;
  varianceColor: (v: number | null) => string;
  t: (typeof T)['fr'] | (typeof T)['en'];
}) {
  const variance = entry.variance_amount ?? 0;
  const patientName = entry.calculation_basis?.patient_name ?? "—";
  const claimNum    = entry.calculation_basis?.claim_number ?? "—";
  const serviceDate = entry.calculation_basis?.service_date ?? null;

  return (
    <div className={`rounded-2xl border transition-all ${
      entry.resolved
        ? "border-white/8 bg-white/2"
        : variance < 0
          ? "border-red-500/20 bg-red-500/5"
          : variance > 0
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-white/10 bg-white/3"
    }`}>
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
          {/* Patient + claim */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">{patientName}</p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {claimNum !== "—" ? `#${claimNum}` : ""}
              {serviceDate ? ` · ${fmtDate(serviceDate)}` : ""}
            </p>
          </div>
          {/* Expected */}
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{t.claimedShort}</p>
            <p className="text-sm font-mono text-white/60">{fmt(entry.expected_amount)}</p>
          </div>
          {/* Received */}
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{t.receivedShort}</p>
            <p className="text-sm font-mono text-white/80">{fmt(entry.actual_amount ?? 0)}</p>
          </div>
          {/* Variance */}
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{t.varianceShort}</p>
            <p className={`text-sm font-mono font-bold ${varianceColor(variance)}`}>
              {variance === 0 ? "—" : fmt(variance)}
            </p>
          </div>
        </div>

        {/* Status badge + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {entry.resolved ? (
            <span className="text-[9px] px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
              {t.resolved}
            </span>
          ) : (
            <span className={`text-[9px] px-2 py-1 rounded-full font-bold border ${
              variance < 0
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : variance > 0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-white/5 border-white/10 text-white/40"
            }`}>
              {variance < 0 ? t.deficit : variance > 0 ? t.surplusLabel : t.balancedLabel}
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-white/20" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-white/6 pt-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <DetailField label={t.detail.source}       value={entry.payment_source ?? "—"} />
            <DetailField label={t.detail.expectedDate} value={fmtDate(entry.expected_date)} />
            <DetailField label={t.detail.receivedDate} value={fmtDate(entry.actual_date)} />
            <DetailField label={t.detail.variancePct}  value={entry.variance_percentage != null ? `${entry.variance_percentage}%` : "—"} />
          </div>
          {entry.discrepancy_reason && (
            <div className="px-3 py-2 rounded-xl bg-white/4 border border-white/8">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">{t.discrepancyReason}</p>
              <p className="text-xs text-white/60">{entry.discrepancy_reason}</p>
            </div>
          )}
          {!entry.resolved && (
            <div className="flex justify-end">
              <button
                onClick={onResolve}
                disabled={resolving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                           border border-green-500/30 bg-green-500/8 text-green-400
                           hover:bg-green-500/15 hover:border-green-500/50 transition-all
                           disabled:opacity-40"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {resolving ? t.resolving : t.markResolved}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white/60 font-mono">{value}</p>
    </div>
  );
}

function EmptyState({ filter, t }: { filter: string; t: (typeof T)['fr'] | (typeof T)['en'] }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
      <CheckCircle className="w-10 h-10 text-green-400/40" />
      <p className="text-white/40 text-sm font-medium">
        {filter === "unresolved" ? t.empty.unresolved
          : filter === "resolved" ? t.empty.resolved
          : t.empty.all}
      </p>
      <p className="text-white/20 text-[11px] text-center max-w-xs">
        {t.empty.hint}
      </p>
      <Link
        href="/claims/ramq"
        className="mt-2 text-[11px] text-white/30 hover:text-white/60 underline transition-colors"
      >
        {t.empty.ramqLink}
      </Link>
    </div>
  );
}
