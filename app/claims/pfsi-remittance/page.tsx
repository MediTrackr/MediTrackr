"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowLeft, Upload, Shield, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Zap, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedLine {
  lineIndex: number;
  claim_number: string | null;
  matched_claim_id: string | null;
  matched: boolean;
  patient_ramq: string | null;
  service_date: string | null;
  act_code: string | null;
  amount_claimed: number | null;
  amount_approved: number | null;
  amount_withheld: number | null;
  reduction_code: string | null;
  reduction_reason: string | null;
}

interface ParseResult {
  importId: string;
  confidence: number;
  paymentDate: string | null;
  chequeNumber: string | null;
  totalApproved: number | null;
  totalWithheld: number | null;
  netPayment: number | null;
  claimsFound: number;
  matchedCount: number;
  lines: ParsedLine[];
}

interface HistoryImport {
  id: string;
  file_name: string | null;
  payment_date: string | null;
  batch_number: string | null;
  total_approved: number | null;
  net_payment: number | null;
  applied_count: number;
  unmatched_count: number;
  status: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number | null) =>
  n == null ? '—' : '$' + Math.abs(n).toLocaleString('fr-CA', { minimumFractionDigits: 2 });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PFSIRemittancePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging]         = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [applying, setApplying]         = useState(false);
  const [parseResult, setParseResult]   = useState<ParseResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [history, setHistory]           = useState<HistoryImport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [applyDone, setApplyDone]       = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data } = await supabase
      .from('remittance_imports')
      .select('id, file_name, payment_date, batch_number, total_approved, net_payment, applied_count, unmatched_count, status, created_at')
      .eq('user_id', user.id)
      .eq('report_type', 'PFSI_EOB')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((data as HistoryImport[]) ?? []);
    setHistoryLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const processFile = async (file: File) => {
    setError(null);
    setParseResult(null);
    setApplyDone(false);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Format non supporté. Convertissez le PDF en image (PNG ou JPG) avant de l\'importer.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop grand (max 10 MB).');
      return;
    }
    setScanning(true);
    try {
      const base64 = await toBase64(file);
      const res = await fetch('/api/ocr/pfsi-remittance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur de traitement');
      if (data.confidence < 30) {
        setError('Document non reconnu comme un avis de prestations PFSI/IFHP (confiance trop faible). Vérifiez l\'image.');
        return;
      }
      setParseResult(data);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erreur lors de l\'analyse.');
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const applyResults = async () => {
    if (!parseResult) return;
    setApplying(true);
    try {
      for (const line of parseResult.lines) {
        if (!line.matched || !line.matched_claim_id || line.amount_approved == null) continue;
        const newStatus = (line.amount_withheld ?? 0) > 0 ? 'partial' : 'paid';
        await supabase.from('pfsi_claims').update({
          amount_received: line.amount_approved,
          status: newStatus,
          updated_at: new Date().toISOString(),
        }).eq('id', line.matched_claim_id);

        await supabase.from('remittance_lines').update({ applied: true, applied_at: new Date().toISOString() })
          .eq('import_id', parseResult.importId)
          .eq('matched_claim_id', line.matched_claim_id);
      }
      await supabase.from('remittance_imports')
        .update({ status: 'applied', updated_at: new Date().toISOString() })
        .eq('id', parseResult.importId);
      setApplyDone(true);
      await fetchHistory();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erreur lors de l\'application.');
    } finally {
      setApplying(false);
    }
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
            <Link href="/claims/pfsi"
              className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <h1 className="text-lg font-bold text-white/90 tracking-tight">Avis de prestations PFSI / IFHP</h1>
              </div>
              <p className="text-[11px] text-white/30 mt-0.5">Medavie Blue Cross EOB · analyse IA · réconciliation auto</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold uppercase tracking-wider">
            <Zap className="w-2.5 h-2.5" /> Claude Haiku
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Upload zone */}
          {!parseResult && !applyDone && (
            <div
              className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer p-12 flex flex-col items-center justify-center gap-4 text-center
                ${dragging ? 'border-primary/60 bg-primary/5' : 'border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4'}
                ${scanning ? 'pointer-events-none opacity-60' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
              {scanning ? (
                <>
                  <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white/60 text-sm font-semibold">Analyse en cours…</p>
                  <p className="text-white/25 text-[11px]">Claude lit l'avis de prestations Medavie Blue Cross</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-white/30" />
                  </div>
                  <div>
                    <p className="text-white/70 font-semibold text-base">Importer un avis EOB / PFSI</p>
                    <p className="text-white/30 text-xs mt-1">PNG · JPG · WebP · max 10 MB</p>
                  </div>
                  <p className="text-white/20 text-[10px] max-w-sm">
                    L'image n'est jamais stockée — seules les données extraites sont conservées (conformité Loi 25).
                  </p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border border-red-500/20 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400/80 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400/40 hover:text-red-400">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Done banner */}
          {applyDone && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-green-500/30 bg-green-500/8">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-400">Avis appliqué avec succès</p>
                <p className="text-[11px] text-green-400/60 mt-0.5">Les demandes PFSI ont été mises à jour. Grand livre synchronisé.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/claims/reconciliation"
                  className="text-[10px] px-3 py-1.5 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all">
                  Voir réconciliation →
                </Link>
                <button onClick={() => { setParseResult(null); setApplyDone(false); setError(null); }}
                  className="text-[10px] px-3 py-1.5 rounded-xl border border-white/10 text-white/40 hover:text-white/60 transition-all">
                  Nouvel import
                </button>
              </div>
            </div>
          )}

          {/* Parse result */}
          {parseResult && !applyDone && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-white/90">Avis de prestations PFSI analysé</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {parseResult.paymentDate ? fmtDate(parseResult.paymentDate) : 'Date inconnue'}
                        {parseResult.chequeNumber ? ` · Chèque #${parseResult.chequeNumber}` : ''}
                        {` · Confiance ${parseResult.confidence}%`}
                      </p>
                    </div>
                  </div>
                  <ConfidenceBadge value={parseResult.confidence} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/6">
                  <AmountCell label="Approuvé total"  value={fmt(parseResult.totalApproved)}  color="text-green-400" />
                  <AmountCell label="Retenu / ajusté" value={fmt(parseResult.totalWithheld)}  color="text-red-400" />
                  <AmountCell label="Paiement net"    value={fmt(parseResult.netPayment)}     color="text-primary" />
                  <AmountCell label="Demandes"
                    value={`${parseResult.matchedCount} / ${parseResult.claimsFound} liées`}
                    color={parseResult.matchedCount === parseResult.claimsFound ? 'text-green-400' : 'text-yellow-400'} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold px-1">
                  Lignes extraites ({parseResult.lines.length})
                </p>
                {parseResult.lines.map(line => (
                  <LineRow key={line.lineIndex} line={line}
                    expanded={expandedLine === line.lineIndex}
                    onToggle={() => setExpandedLine(expandedLine === line.lineIndex ? null : line.lineIndex)} />
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setParseResult(null); setError(null); }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  ← Importer un autre document
                </button>
                <button onClick={applyResults} disabled={applying || parseResult.matchedCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-black hover:bg-primary/90 transition-all disabled:opacity-40">
                  {applying
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Application…</>
                    : <><CheckCircle className="w-4 h-4" /> Appliquer {parseResult.matchedCount} demande{parseResult.matchedCount !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
              {parseResult.matchedCount === 0 && (
                <p className="text-[10px] text-yellow-400/60 text-center">
                  Aucune demande correspondante trouvée. Vérifiez que les demandes existent dans le centre PFSI/IFHP.
                </p>
              )}
            </div>
          )}

          {/* History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Imports précédents</p>
              <button onClick={fetchHistory} className="text-white/20 hover:text-white/50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {historyLoading ? (
              <p className="text-white/20 text-xs py-4 text-center">Chargement…</p>
            ) : history.length === 0 ? (
              <p className="text-white/15 text-xs py-6 text-center">Aucun import PFSI pour l'instant</p>
            ) : (
              <div className="space-y-2">
                {history.map(imp => <HistoryRow key={imp.id} imp={imp} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : value >= 50           ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    :                         'text-red-400 bg-red-500/10 border-red-500/20';
  return <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${color}`}>{value}% confiance</span>;
}

function AmountCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function LineRow({ line, expanded, onToggle }: { line: ParsedLine; expanded: boolean; onToggle: () => void }) {
  const hasWithheld = (line.amount_withheld ?? 0) > 0;
  return (
    <div className={`rounded-2xl border transition-all ${
      line.matched ? hasWithheld ? 'border-yellow-500/20 bg-yellow-500/4' : 'border-green-500/20 bg-green-500/4'
                   : 'border-white/8 bg-white/2'
    }`}>
      <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer select-none" onClick={onToggle}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${line.matched ? hasWithheld ? 'bg-yellow-400' : 'bg-green-400' : 'bg-white/20'}`} />
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium truncate">{line.patient_ramq ?? line.claim_number ?? '—'}</p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {line.service_date ?? '—'}{line.act_code ? ` · Code ${line.act_code}` : ''}
              {!line.matched && <span className="ml-1.5 text-white/20">non liée</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Réclamé</p>
            <p className="text-xs font-mono text-white/50">{line.amount_claimed != null ? `$${line.amount_claimed.toFixed(2)}` : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Approuvé</p>
            <p className={`text-xs font-mono font-semibold ${line.matched ? 'text-green-400' : 'text-white/50'}`}>
              {line.amount_approved != null ? `$${line.amount_approved.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Retenu</p>
            <p className={`text-xs font-mono ${hasWithheld ? 'text-red-400' : 'text-white/20'}`}>
              {hasWithheld ? `$${(line.amount_withheld ?? 0).toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
      </div>
      {expanded && (
        <div className="px-5 pb-3.5 pt-1 border-t border-white/6 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <Field label="Nº demande"    value={line.claim_number ?? '—'} />
            <Field label="ID client IFHP" value={line.patient_ramq ?? '—'} />
            <Field label="Date service"  value={line.service_date ?? '—'} />
            <Field label="Liaison"
              value={line.matched ? 'Liée à une demande' : 'Non trouvée'}
              vc={line.matched ? 'text-green-400' : 'text-yellow-400'} />
          </div>
          {(line.reduction_code || line.reduction_reason) && (
            <div className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-[9px] text-red-400/50 uppercase tracking-wider mb-1">Motif de réduction</p>
              <p className="text-xs text-red-400/80">
                {line.reduction_code ? `[${line.reduction_code}] ` : ''}{line.reduction_reason ?? '—'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, vc = 'text-white/60' }: { label: string; value: string; vc?: string }) {
  return (
    <div>
      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-mono text-[11px] ${vc}`}>{value}</p>
    </div>
  );
}

function HistoryRow({ imp }: { imp: HistoryImport }) {
  const sc = imp.status === 'applied' ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : imp.status === 'partial'        ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    :                                   'text-white/40 bg-white/5 border-white/10';
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl border border-white/6 bg-white/2">
      <Clock className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/60 font-medium truncate">{imp.file_name ?? 'Import sans nom'}</p>
        <p className="text-[10px] text-white/25 mt-0.5">
          {imp.payment_date ? fmtDate(imp.payment_date) : 'Date inconnue'}
          {imp.batch_number ? ` · Chèque ${imp.batch_number}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono text-white/50">{imp.net_payment != null ? `$${imp.net_payment.toFixed(2)}` : '—'}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{imp.applied_count} liée{imp.applied_count !== 1 ? 's' : ''}{imp.unmatched_count > 0 ? ` · ${imp.unmatched_count} non trouvée${imp.unmatched_count !== 1 ? 's' : ''}` : ''}</p>
      </div>
      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${sc}`}>
        {imp.status === 'applied' ? 'Appliqué' : imp.status === 'partial' ? 'Partiel' : imp.status === 'rejected' ? 'Rejeté' : 'En attente'}
      </span>
    </div>
  );
}
