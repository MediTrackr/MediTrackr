"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, Eye, FileText, CheckCircle, XCircle,
  Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import { validateRAMQClaim, getValidationSummary, ActCode } from "@/utils/ramq-adjudicator";
import { ValidationPanel, ValidationBadge } from "@/components/ValidationPanel";
import { ProfessionalCategory } from "@/utils/ramq-categories";

// ── Types ─────────────────────────────────────────────────────────────────────

type ClaimStatus =
  | 'draft' | 'submitted' | 'approved'
  | 'rejected' | 'paid' | 'partial' | 'review_needed';

type FilterTab = 'all' | 'pending' | 'paid' | 'partial' | 'rejected' | 'review_needed' | 'draft';

interface RAMQClaim {
  id: string;
  patient_name: string;
  patient_ramq: string;
  patient_dob?: string;
  total_claimed: number;
  amount_received?: number;
  service_date: string;
  status: ClaimStatus;
  act_codes?: Array<{ code: string; description: string; fee: number; quantity: number }>;
  claim_number?: string;
  rejection_reason?: string;
  rejection_code?: string;
  submitted_at?: string;
  created_at: string;
  doctor_ramq?: string;
  location_code?: string;
  diagnostic_code?: string;
  professional_category?: ProfessionalCategory;
  notes?: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  dot: string;
  badge: string;
  border: string;
  card: string;
  icon: React.ReactNode;
}> = {
  paid: {
    label: 'Payé',
    dot: '🟢',
    badge: 'text-green-400 bg-green-500/10 border-green-500/30',
    border: 'border-green-500/40',
    card: 'bg-green-500/5',
    icon: <CheckCircle className="w-4 h-4 text-green-400" />,
  },
  partial: {
    label: 'Partiel',
    dot: '🟡',
    badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    border: 'border-yellow-500/40',
    card: 'bg-yellow-500/5',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  },
  rejected: {
    label: 'Rejeté',
    dot: '🔴',
    badge: 'text-red-400 bg-red-500/10 border-red-500/30',
    border: 'border-red-500/40',
    card: 'bg-red-500/5',
    icon: <XCircle className="w-4 h-4 text-red-400" />,
  },
  pending: {
    label: 'En attente',
    dot: '🔵',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    border: 'border-blue-500/40',
    card: 'bg-blue-500/5',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
  },
  review_needed: {
    label: 'À réviser',
    dot: '🟣',
    badge: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    border: 'border-purple-500/40',
    card: 'bg-purple-500/5',
    icon: <AlertTriangle className="w-4 h-4 text-purple-400" />,
  },
  draft: {
    label: 'Brouillon',
    dot: '⬜',
    badge: 'text-white/40 bg-white/5 border-white/10',
    border: 'border-white/10',
    card: 'bg-white/2',
    icon: <FileText className="w-4 h-4 text-white/30" />,
  },
  submitted: {
    label: 'Soumis',
    dot: '🔵',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    border: 'border-blue-500/40',
    card: 'bg-blue-500/5',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
  },
  approved: {
    label: 'Approuvé',
    dot: '🔵',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    border: 'border-blue-500/40',
    card: 'bg-blue-500/5',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
  },
};

// Derives the display status for a claim (partial auto-detection)
function getDisplayStatus(claim: RAMQClaim): string {
  if (claim.status === 'paid') {
    if (claim.amount_received != null && claim.amount_received < claim.total_claimed * 0.99) {
      return 'partial';
    }
    return 'paid';
  }
  if (claim.status === 'submitted' || claim.status === 'approved') return 'pending';
  return claim.status;
}

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  statusKey: string;
  count: number;
  amount: number;
  active: boolean;
  onClick: () => void;
}

function SummaryCard({ statusKey, count, amount, active, onClick }: SummaryCardProps) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[120px] p-4 rounded-2xl border text-left transition-all cursor-pointer
        ${active ? `${cfg.border} ${cfg.card} shadow-lg scale-[1.02]` : 'border-white/8 bg-white/2 hover:border-white/20'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {cfg.icon}
        <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/50">{cfg.label}</span>
      </div>
      <p className="text-xl font-black text-white">{count}</p>
      <p className="text-[10px] text-white/30 mt-0.5">${amount.toFixed(2)}</p>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RAMQCommandCenter() {
  const supabase = createClient();
  const router = useRouter();

  const [claims, setClaims]       = useState<RAMQClaim[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterTab>('all');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);

  // Summary counts
  const [summary, setSummary] = useState({
    paid: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    review_needed: { count: 0, amount: 0 },
    draft: { count: 0, amount: 0 },
    total_claimed: 0,
    total_received: 0,
  });

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('ramq_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('service_date', { ascending: false });

      if (!data) return;
      setClaims(data as RAMQClaim[]);

      // Build summary
      const s = {
        paid:          { count: 0, amount: 0 },
        partial:       { count: 0, amount: 0 },
        rejected:      { count: 0, amount: 0 },
        pending:       { count: 0, amount: 0 },
        review_needed: { count: 0, amount: 0 },
        draft:         { count: 0, amount: 0 },
        total_claimed: 0,
        total_received: 0,
      };

      for (const c of data as RAMQClaim[]) {
        const ds = getDisplayStatus(c);
        s.total_claimed  += c.total_claimed || 0;
        s.total_received += c.amount_received || 0;

        if (ds === 'paid')          { s.paid.count++;          s.paid.amount          += c.amount_received || c.total_claimed; }
        else if (ds === 'partial')  { s.partial.count++;       s.partial.amount       += c.total_claimed; }
        else if (ds === 'rejected') { s.rejected.count++;      s.rejected.amount      += c.total_claimed; }
        else if (ds === 'pending')  { s.pending.count++;       s.pending.amount       += c.total_claimed; }
        else if (ds === 'review_needed') { s.review_needed.count++; s.review_needed.amount += c.total_claimed; }
        else if (ds === 'draft')    { s.draft.count++;         s.draft.amount         += c.total_claimed; }
      }

      setSummary(s);
    } catch (e) {
      console.error('fetchClaims', e);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // ── Filter logic ────────────────────────────────────────────────────────────

  const filtered = claims.filter(c => {
    if (filter === 'all') return true;
    const ds = getDisplayStatus(c);
    if (filter === 'pending') return ds === 'pending';
    return ds === filter;
  });

  // ── Status update ───────────────────────────────────────────────────────────

  const updateStatus = async (claim: RAMQClaim, newStatus: ClaimStatus) => {
    setUpdating(claim.id);
    try {
      const patch: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'submitted') patch.submitted_at = new Date().toISOString();
      if (newStatus === 'review_needed') patch.reviewed_at = new Date().toISOString();

      const { error } = await supabase.from('ramq_claims').update(patch).eq('id', claim.id);
      if (error) throw error;
      await fetchClaims();
    } catch (e) {
      console.error('updateStatus', e);
      alert('Erreur lors de la mise à jour du statut.');
    } finally {
      setUpdating(null);
    }
  };

  const handleSubmit = async (claim: RAMQClaim) => {
    const validation = validateRAMQClaim(claim.act_codes || [], [], {
      serviceDate: claim.service_date,
      doctorRamq: claim.doctor_ramq,
      locationCode: claim.location_code,
      patientDob: claim.patient_dob,
      diagnosticCode: claim.diagnostic_code,
      professionalCategory: claim.professional_category,
    });

    if (!validation.isValid) {
      alert(`Facture NON RECEVABLE :\n\n${validation.errors.join('\n')}`);
      return;
    }
    if (validation.warnings.length > 0) {
      if (!window.confirm(`Avertissements :\n\n${validation.warnings.join('\n')}\n\nContinuer ?`)) return;
    }

    await updateStatus(claim, 'submitted');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',          label: 'Tous',         count: claims.length },
    { key: 'pending',      label: 'En attente',   count: summary.pending.count },
    { key: 'paid',         label: 'Payé',          count: summary.paid.count },
    { key: 'partial',      label: 'Partiel',       count: summary.partial.count },
    { key: 'rejected',     label: 'Rejeté',        count: summary.rejected.count },
    { key: 'review_needed',label: 'À réviser',     count: summary.review_needed.count },
    { key: 'draft',        label: 'Brouillon',     count: summary.draft.count },
  ];

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        {/* Background watermark */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5 text-primary">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 m-6 p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Centre de Facturation RAMQ</h1>
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mt-0.5">
              {claims.length} réclamation{claims.length !== 1 ? 's' : ''} · {summary.total_claimed > 0 ? `$${summary.total_claimed.toFixed(2)} réclamé` : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/claims/reconciliation">
              <Button variant="ghost" className="gap-2 text-white/50 border border-white/10 bg-black/40 rounded-xl px-4 h-10 hover:text-white/80 hover:border-white/20">
                <BarChart3 className="w-4 h-4" /> Réconciliation
              </Button>
            </Link>
            <Link href="/claims/remittance">
              <Button variant="ghost" className="gap-2 text-white/50 border border-white/10 bg-black/40 rounded-xl px-4 h-10 hover:text-white/80 hover:border-white/20">
                <FileText className="w-4 h-4" /> Avis de paiement
              </Button>
            </Link>
            <Link href="/dashboard/invoice/new">
              <Button className="gap-2 bg-primary text-black rounded-xl px-4 h-10 font-bold hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Nouvelle réclamation
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 flex flex-col gap-4">

          {/* Summary cards */}
          <div className="flex gap-3 flex-wrap">
            {(['paid','partial','rejected','pending','review_needed'] as const).map(key => (
              <SummaryCard
                key={key}
                statusKey={key}
                count={summary[key].count}
                amount={summary[key].amount}
                active={filter === key}
                onClick={() => setFilter(filter === key ? 'all' : key)}
              />
            ))}

            {/* Totals block */}
            <div className="flex-1 min-w-[200px] p-4 rounded-2xl border border-white/8 bg-white/2 flex flex-col justify-between">
              <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/30 mb-3">Réconciliation</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">Réclamé</span>
                  <span className="text-sm font-bold text-white">${summary.total_claimed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">Reçu</span>
                  <span className="text-sm font-bold text-green-400">${summary.total_received.toFixed(2)}</span>
                </div>
                <div className="w-full h-px bg-white/8 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">Écart</span>
                  <span className={`text-sm font-bold ${summary.total_claimed - summary.total_received > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ${Math.abs(summary.total_claimed - summary.total_received).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-black/40 border border-white/8 rounded-2xl p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-all
                  ${filter === tab.key
                    ? 'bg-primary text-black'
                    : 'text-white/40 hover:text-white/70'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black
                    ${filter === tab.key ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Claims list */}
          <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-3">
              {loading ? (
                <div className="text-center text-white/30 py-16 text-sm">Chargement...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-white/30 text-sm">Aucune réclamation dans cette catégorie</p>
                </div>
              ) : (
                filtered.map(claim => {
                  const ds = getDisplayStatus(claim);
                  const cfg = STATUS_CONFIG[ds] || STATUS_CONFIG.draft;
                  const isExpanded = expanded === claim.id;
                  const variance = claim.amount_received != null
                    ? claim.total_claimed - claim.amount_received
                    : null;

                  return (
                    <div
                      key={claim.id}
                      className={`rounded-2xl border transition-all ${cfg.border} ${cfg.card}`}
                    >
                      {/* Main row */}
                      <div className="p-5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5">{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-white truncate">{claim.patient_name}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-[0.15em] ${cfg.badge}`}>
                                {cfg.dot} {cfg.label}
                              </span>
                              {claim.claim_number && (
                                <span className="text-[9px] text-white/25 font-mono">#{claim.claim_number}</span>
                              )}
                              {claim.status === 'draft' && (() => {
                                const v = getValidationSummary(
                                  (claim.act_codes as ActCode[]) || [],
                                  [],
                                  {
                                    serviceDate: claim.service_date,
                                    doctorRamq: claim.doctor_ramq,
                                    patientRamq: claim.patient_ramq,
                                    patientDob: claim.patient_dob,
                                    locationCode: claim.location_code,
                                    diagnosticCode: claim.diagnostic_code,
                                    professionalCategory: claim.professional_category,
                                    existingClaims: claims,
                                    claimId: claim.id,
                                  }
                                );
                                return <ValidationBadge errorCount={v.errorCount} warningCount={v.warningCount} />;
                              })()}
                            </div>
                            <p className="text-[11px] text-white/40">
                              RAMQ {claim.patient_ramq}
                              {claim.service_date && ` · ${new Date(claim.service_date).toLocaleDateString('fr-CA')}`}
                              {claim.submitted_at && ` · soumis ${new Date(claim.submitted_at).toLocaleDateString('fr-CA')}`}
                            </p>
                            {claim.rejection_reason && (
                              <p className="text-[11px] text-red-400/80 mt-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3 flex-shrink-0" />
                                {claim.rejection_code && <span className="font-mono font-bold">[{claim.rejection_code}]</span>}
                                {claim.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-black text-primary">${claim.total_claimed?.toFixed(2) ?? '0.00'}</p>
                          {claim.amount_received != null && (
                            <p className={`text-xs font-bold ${claim.amount_received >= claim.total_claimed * 0.99 ? 'text-green-400' : 'text-yellow-400'}`}>
                              Reçu ${claim.amount_received.toFixed(2)}
                            </p>
                          )}
                          {variance != null && variance > 0.01 && (
                            <p className="text-[10px] text-red-400">Écart −${variance.toFixed(2)}</p>
                          )}
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : claim.id)}
                          className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 mt-1"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Act codes strip */}
                      {claim.act_codes && claim.act_codes.length > 0 && (
                        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                          {claim.act_codes.map((act, i) => (
                            <span key={i} className="text-[9px] px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-white/50 font-mono">
                              {act.code} · ${act.fee?.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded: validation + actions */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-white/8 space-y-3">
                          {/* Validation panel — shown for draft and rejected claims */}
                          {(claim.status === 'draft' || claim.status === 'rejected' || claim.status === 'review_needed') && (() => {
                            const result = validateRAMQClaim(
                              (claim.act_codes as ActCode[]) || [],
                              [],
                              {
                                serviceDate: claim.service_date,
                                doctorRamq: claim.doctor_ramq,
                                patientRamq: claim.patient_ramq,
                                patientDob: claim.patient_dob,
                                locationCode: claim.location_code,
                                diagnosticCode: claim.diagnostic_code,
                                professionalCategory: claim.professional_category,
                                existingClaims: claims,
                                claimId: claim.id,
                              }
                            );
                            return <ValidationPanel result={result} />;
                          })()}

                        <div className="flex flex-wrap gap-2 items-center">
                          <Link href={`/claims/ramq/${claim.id}`}>
                            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs">
                              <Eye className="w-3.5 h-3.5 mr-1.5" /> Fiche complète
                            </Button>
                          </Link>

                          {claim.status === 'draft' && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-green-400 hover:bg-green-500/10 text-xs"
                              disabled={updating === claim.id}
                              onClick={() => handleSubmit(claim)}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              {updating === claim.id ? 'Envoi...' : 'Soumettre à la RAMQ'}
                            </Button>
                          )}

                          {(claim.status === 'rejected' || claim.status === 'review_needed') && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-blue-400 hover:bg-blue-500/10 text-xs"
                              disabled={updating === claim.id}
                              onClick={() => updateStatus(claim, 'draft')}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reprendre en brouillon
                            </Button>
                          )}

                          {(claim.status === 'submitted' || claim.status === 'approved') && (
                            <>
                              <Button
                                size="sm" variant="ghost"
                                className="text-yellow-400 hover:bg-yellow-500/10 text-xs"
                                disabled={updating === claim.id}
                                onClick={() => updateStatus(claim, 'partial')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Marquer partiel
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="text-purple-400 hover:bg-purple-500/10 text-xs"
                                disabled={updating === claim.id}
                                onClick={() => updateStatus(claim, 'review_needed')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Flaguer révision
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="text-green-400 hover:bg-green-500/10 text-xs"
                                disabled={updating === claim.id}
                                onClick={() => updateStatus(claim, 'paid')}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Marquer payé
                              </Button>
                            </>
                          )}

                          {claim.status === 'paid' && ds === 'partial' && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-purple-400 hover:bg-purple-500/10 text-xs"
                              disabled={updating === claim.id}
                              onClick={() => updateStatus(claim, 'review_needed')}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Flaguer révision
                            </Button>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
