"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, Shield, CheckCircle, XCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Download, Trash2,
  RefreshCw, FileText, BarChart3, ChevronRight, Banknote as BanknoteIcon,
} from "lucide-react";
import { validatePFSIClaim, getPFSIValidationSummary } from "@/utils/pfsi-validator";
import { ValidationPanel, ValidationBadge } from "@/components/ValidationPanel";

// ── Types ──────────────────────────────────────────────────────────────────────

type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'partial' | 'review_needed';
type FilterTab   = 'all' | 'pending' | 'paid' | 'partial' | 'rejected' | 'review_needed' | 'draft';

interface ServiceLine {
  invoice_number?:        string;
  date_of_service?:       string;
  fee_code?:              string;
  units_of_time?:         string;
  icd_code?:              string;
  prescriber_designation?: string;
  amount?:                number;
}

interface PFSIClaim {
  id: string;
  patient_name: string;
  client_id?: string;
  patient_dob?: string;
  claim_number?: string;
  invoice_number?: string;
  approval_type?: 'prior' | 'post';
  specialty?: string;
  referring_prescriber?: string;
  service_lines?: ServiceLine[];
  total_claimed: number;
  amount_received?: number;
  status: ClaimStatus;
  rejection_reason?: string;
  rejection_code?: string;
  additional_info?: string;
  submitted_at?: string;
  created_at: string;
}

interface FormState {
  patient_name: string;
  client_id: string;
  patient_dob: string;
  approval_type: 'prior' | 'post';
  specialty: string;
  referring_prescriber: string;
  additional_info: string;
  lines: ServiceLine[];
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string; card: string; icon: React.ReactNode }> = {
  paid:          { label: 'Payé',        badge: 'text-green-400 bg-green-500/10 border-green-500/30',   border: 'border-green-500/40',  card: 'bg-green-500/5',  icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
  partial:       { label: 'Partiel',     badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', border: 'border-yellow-500/40', card: 'bg-yellow-500/5', icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
  rejected:      { label: 'Rejeté',      badge: 'text-red-400 bg-red-500/10 border-red-500/30',         border: 'border-red-500/40',    card: 'bg-red-500/5',    icon: <XCircle className="w-4 h-4 text-red-400" /> },
  pending:       { label: 'En attente',  badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      border: 'border-blue-500/40',   card: 'bg-blue-500/5',   icon: <Clock className="w-4 h-4 text-blue-400" /> },
  review_needed: { label: 'À réviser',   badge: 'text-purple-400 bg-purple-500/10 border-purple-500/30', border: 'border-purple-500/40', card: 'bg-purple-500/5', icon: <AlertTriangle className="w-4 h-4 text-purple-400" /> },
  draft:         { label: 'Brouillon',   badge: 'text-white/40 bg-white/5 border-white/10',             border: 'border-white/10',      card: 'bg-white/2',      icon: <FileText className="w-4 h-4 text-white/30" /> },
  submitted:     { label: 'Soumis',      badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      border: 'border-blue-500/40',   card: 'bg-blue-500/5',   icon: <Clock className="w-4 h-4 text-blue-400" /> },
  approved:               { label: 'Approuvé',                badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',     border: 'border-blue-500/40',   card: 'bg-blue-500/5',   icon: <Clock className="w-4 h-4 text-blue-400" /> },
  deposit_received:       { label: 'Dépôt reçu',             badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30',   border: 'border-amber-500/40',  card: 'bg-amber-500/5',  icon: <BanknoteIcon className="w-4 h-4 text-amber-400" /> },
  reconciliation_pending: { label: 'Réconciliation en cours', badge: 'text-orange-400 bg-orange-500/10 border-orange-500/30', border: 'border-orange-500/40', card: 'bg-orange-500/5', icon: <RefreshCw className="w-4 h-4 text-orange-400" /> },
};

function getDisplayStatus(claim: PFSIClaim): string {
  if (claim.status === 'paid' && claim.amount_received != null && claim.amount_received < claim.total_claimed * 0.99) return 'partial';
  if (claim.status === 'submitted' || claim.status === 'approved') return 'pending';
  return claim.status;
}

const emptyLine = (): ServiceLine => ({
  invoice_number: '', date_of_service: '', fee_code: '', units_of_time: '1',
  icd_code: '', prescriber_designation: 'MD', amount: undefined,
});

const inputCls = "w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40";
const labelCls = "text-[9px] uppercase font-bold text-white/30 tracking-wider";

// ── i18n ──────────────────────────────────────────────────────────────────────

const T = {
  fr: {
    title: 'Centre PFSI / IFHP',
    subtitle: (n: number, total: string) => `Medavie Blue Cross · ${n} demande${n !== 1 ? 's' : ''} · ${total} réclamé`,
    reconciliation: 'Réconciliation',
    remittance: 'Avis de paiement',
    newClaim: 'Nouvelle demande',
    back: 'Retour',
    totalClaimed: 'Réclamé',
    totalReceived: 'Reçu',
    gap: 'Écart',
    reconciliationBlock: 'Réconciliation',
    loading: 'Chargement...',
    noClaims: 'Aucune demande PFSI',
    noClaimsFilter: 'Aucune demande PFSI pour ce filtre',
    createClaim: 'Créer une demande',
    tabs: { all:'Tous', pending:'En attente', paid:'Payé', partial:'Partiel', rejected:'Rejeté', review_needed:'À réviser', draft:'Brouillon' },
    statusLabels: { paid:'Payé', partial:'Partiel', rejected:'Rejeté', pending:'En attente', review_needed:'À réviser', draft:'Brouillon', submitted:'Soumis', approved:'Approuvé' },
    actions: { submit:'Soumettre', markPaid:'Marquer payé', partial:'Partiel', rejected:'Rejeté', review:'À réviser', backDraft:'Retour brouillon', delete:'Supprimer' },
    approval: { prior:'Préalable', post:'Postérieure' },
    invalidClaim: 'Demande invalide :',
    warnings: 'Avertissements :',
    continueQ: '\n\nContinuer ?',
    deleteConfirm: 'Supprimer cette demande PFSI ?',
    form: {
      title: 'Nouvelle demande de règlement',
      cancel: 'Annuler',
      steps: ['1. Patient', '2. Services', '3. Révision'],
      stepLabels: ['Patient', 'Services', 'Révision'],
      fullName: 'Nom complet du patient *',
      namePlaceholder: 'Nom Prénom',
      ifhpId: 'Numéro IFHP / PFSI *',
      idPlaceholder: 'Ex: 1234567890AB',
      dob: 'Date de naissance',
      approvalType: "Type d'approbation",
      specialty: 'Spécialité (si applicable)',
      specialtyPh: 'Ex: Médecine générale',
      referrer: 'Médecin référent (si spécialiste)',
      referrerPh: 'Dr. Nom',
      continue: 'Continuer',
      serviceLines: 'Lignes de service',
      add: 'Ajouter',
      headers: ['Nº facture', 'Date service', 'Code honor.', 'Unités', 'Code CIM', 'Désig.', 'Montant', ''],
      clinicalDetails: 'Détails cliniques / justification (section 4)',
      clinicalPh: 'Détails cliniques ou justification de la demande...',
      back: 'Retour',
      review: 'Réviser',
      reviewTitle: 'Révision de la demande',
      patient: 'Patient',
      ifhpIdLabel: 'ID IFHP',
      birth: 'Naissance',
      approvalLabel: 'Approbation',
      servicesLabel: (n: number) => `Services (${n} ligne${n > 1 ? 's' : ''})`,
      submitClaim: 'Soumettre la demande',
      saveDraft: 'Sauvegarder comme brouillon',
      modify: '← Modifier',
      saving: 'Enregistrement…',
    },
  },
  en: {
    title: 'PFSI / IFHP Center',
    subtitle: (n: number, total: string) => `Medavie Blue Cross · ${n} claim${n !== 1 ? 's' : ''} · ${total} claimed`,
    reconciliation: 'Reconciliation',
    remittance: 'Remittance notice',
    newClaim: 'New claim',
    back: 'Back',
    totalClaimed: 'Claimed',
    totalReceived: 'Received',
    gap: 'Gap',
    reconciliationBlock: 'Reconciliation',
    loading: 'Loading...',
    noClaims: 'No PFSI claims',
    noClaimsFilter: 'No PFSI claims for this filter',
    createClaim: 'Create a claim',
    tabs: { all:'All', pending:'Pending', paid:'Paid', partial:'Partial', rejected:'Rejected', review_needed:'Review', draft:'Draft' },
    statusLabels: { paid:'Paid', partial:'Partial', rejected:'Rejected', pending:'Pending', review_needed:'Review', draft:'Draft', submitted:'Submitted', approved:'Approved' },
    actions: { submit:'Submit', markPaid:'Mark paid', partial:'Partial', rejected:'Rejected', review:'Review', backDraft:'Back to draft', delete:'Delete' },
    approval: { prior:'Prior', post:'Post' },
    invalidClaim: 'Invalid claim:',
    warnings: 'Warnings:',
    continueQ: '\n\nContinue?',
    deleteConfirm: 'Delete this PFSI claim?',
    form: {
      title: 'New settlement claim',
      cancel: 'Cancel',
      steps: ['1. Patient', '2. Services', '3. Review'],
      stepLabels: ['Patient', 'Services', 'Review'],
      fullName: 'Full patient name *',
      namePlaceholder: 'Last First',
      ifhpId: 'IFHP / PFSI number *',
      idPlaceholder: 'e.g. 1234567890AB',
      dob: 'Date of birth',
      approvalType: 'Approval type',
      specialty: 'Specialty (if applicable)',
      specialtyPh: 'e.g. General medicine',
      referrer: 'Referring physician (if specialist)',
      referrerPh: 'Dr. Name',
      continue: 'Continue',
      serviceLines: 'Service lines',
      add: 'Add',
      headers: ['Invoice #', 'Service date', 'Fee code', 'Units', 'ICD code', 'Desig.', 'Amount', ''],
      clinicalDetails: 'Clinical details / justification (section 4)',
      clinicalPh: 'Clinical details or justification for the claim...',
      back: 'Back',
      review: 'Review',
      reviewTitle: 'Claim review',
      patient: 'Patient',
      ifhpIdLabel: 'IFHP ID',
      birth: 'Birth',
      approvalLabel: 'Approval',
      servicesLabel: (n: number) => `Services (${n} line${n > 1 ? 's' : ''})`,
      submitClaim: 'Submit claim',
      saveDraft: 'Save as draft',
      modify: '← Edit',
      saving: 'Saving…',
    },
  },
} as const;

// ── Summary card ───────────────────────────────────────────────────────────────

function SummaryCard({ statusKey, label, count, amount, active, onClick }: {
  statusKey: string; label: string; count: number; amount: number; active: boolean; onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <button onClick={onClick}
      className={`flex-1 min-w-[110px] p-4 rounded-2xl border text-left transition-all cursor-pointer
        ${active ? `${cfg.border} ${cfg.card} scale-[1.02]` : 'border-white/8 bg-white/2 hover:border-white/20'}`}>
      <div className="flex items-center gap-2 mb-2">{cfg.icon}<span className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/50">{label}</span></div>
      <p className="text-xl font-black text-white">{count}</p>
      <p className="text-[10px] text-white/30 mt-0.5">${amount.toFixed(2)}</p>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PFSICommandCenter() {
  const supabase = createClient();
  const router = useRouter();
  const [lang] = useLang();
  const t = T[lang];

  const [claims, setClaims]     = useState<PFSIClaim[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterTab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [view, setView]         = useState<'list' | 'new'>('list');
  const [step, setStep]         = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile]   = useState<{ first_name?: string; last_name?: string; ramq_number?: string; address?: string; phone?: string } | null>(null);

  const [form, setForm] = useState<FormState>({
    patient_name: '', client_id: '', patient_dob: '',
    approval_type: 'post', specialty: '', referring_prescriber: '',
    additional_info: '', lines: [emptyLine()],
  });

  const [summary, setSummary] = useState({
    paid:          { count: 0, amount: 0 },
    partial:       { count: 0, amount: 0 },
    rejected:      { count: 0, amount: 0 },
    pending:       { count: 0, amount: 0 },
    review_needed: { count: 0, amount: 0 },
    draft:         { count: 0, amount: 0 },
    total_claimed: 0, total_received: 0,
  });

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const [{ data: claimsData }, { data: profileData }, { data: pracData }] = await Promise.all([
      supabase.from('pfsi_claims').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('first_name, last_name, ramq_number, address, phone').eq('id', user.id).maybeSingle(),
      supabase.from('practice_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (profileData || pracData) setProfile({ ...profileData, ...pracData });

    if (claimsData) {
      const rows = claimsData as PFSIClaim[];
      // parse service_lines from JSONB if needed
      const parsed = rows.map(r => ({
        ...r,
        service_lines: Array.isArray(r.service_lines) ? r.service_lines : (r.service_lines ? JSON.parse(r.service_lines as unknown as string) : []),
      }));
      setClaims(parsed);

      const s = { paid: { count:0,amount:0 }, partial: { count:0,amount:0 }, rejected: { count:0,amount:0 }, pending: { count:0,amount:0 }, review_needed: { count:0,amount:0 }, draft: { count:0,amount:0 }, total_claimed:0, total_received:0 };
      for (const c of parsed) {
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
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const filtered = useMemo(() => claims.filter(c => {
    if (filter === 'all') return true;
    const ds = getDisplayStatus(c);
    if (filter === 'pending') return ds === 'pending';
    return ds === filter;
  }), [claims, filter]);

  const total = useMemo(() => form.lines.reduce((s, l) => s + (l.amount ?? 0), 0), [form.lines]);

  function updateLine(i: number, key: keyof ServiceLine, val: string | number | undefined) {
    setForm(f => { const lines = [...f.lines]; lines[i] = { ...lines[i], [key]: val }; return { ...f, lines }; });
  }

  const updateStatus = async (claim: PFSIClaim, newStatus: ClaimStatus) => {
    setUpdating(claim.id);
    const patch: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'submitted') patch.submitted_at = new Date().toISOString();
    if (newStatus === 'review_needed') patch.reviewed_at = new Date().toISOString();
    await supabase.from('pfsi_claims').update(patch).eq('id', claim.id);
    await fetchClaims();
    setUpdating(null);
  };

  const handleSubmit = async (claim: PFSIClaim) => {
    const result = validatePFSIClaim({
      patient_name: claim.patient_name, client_id: claim.client_id,
      patient_dob: claim.patient_dob, approval_type: claim.approval_type,
      specialty: claim.specialty, referring_prescriber: claim.referring_prescriber,
      service_lines: claim.service_lines, additional_info: claim.additional_info,
    });
    if (!result.isValid) { alert(`${t.invalidClaim}\n\n${result.errors.join('\n')}`); return; }
    if (result.warnings.length > 0) { if (!window.confirm(`${t.warnings}\n\n${result.warnings.join('\n')}${t.continueQ}`)) return; }
    await updateStatus(claim, 'submitted');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    await supabase.from('pfsi_claims').delete().eq('id', id);
    setClaims(c => c.filter(x => x.id !== id));
  };

  const handleGeneratePDF = async (claim: PFSIClaim) => {
    const { generatePFSIPDF } = await import('@/lib/pdf/pfsi');
    const pdf = generatePFSIPDF({
      approval_type:        claim.approval_type ?? 'post',
      patient_name:         claim.patient_name,
      client_id:            claim.client_id ?? '',
      dob:                  claim.patient_dob ?? '',
      specialty:            claim.specialty ?? '',
      referring_prescriber: claim.referring_prescriber ?? '',
      provider_name:        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '',
      provider_number:      profile?.ramq_number ?? '',
      provider_address:     profile?.address ?? '',
      provider_city: '', provider_province: 'QC', provider_postal: '',
      provider_phone:       profile?.phone ?? '',
      provider_fax:         '',
      lines:                (claim.service_lines ?? []).map(l => ({
        invoice_number:        l.invoice_number ?? '',
        date_of_service:       l.date_of_service ?? '',
        fee_code:              l.fee_code ?? '',
        units_of_time:         String(l.units_of_time ?? '1'),
        icd_code:              l.icd_code ?? '',
        prescriber_designation: l.prescriber_designation ?? 'MD',
        amount:                l.amount ?? 0,
      })),
      additional_info:      claim.additional_info ?? '',
    });
    pdf.save(`PFSI-${claim.patient_name.replace(/\s+/g, '_')}-${claim.created_at.slice(0,10)}.pdf`);
  };

  const saveClaim = async (status: 'draft' | 'submitted') => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    if (status === 'submitted') {
      const result = validatePFSIClaim({ ...form, service_lines: form.lines });
      if (!result.isValid) { alert(`${t.invalidClaim}\n\n${result.errors.join('\n')}`); setSubmitting(false); return; }
    }

    await supabase.from('pfsi_claims').insert({
      user_id:              user.id,
      patient_name:         form.patient_name,
      client_id:            form.client_id,
      patient_dob:          form.patient_dob || null,
      invoice_number:       `PFSI-${Date.now().toString().slice(-8)}`,
      approval_type:        form.approval_type,
      specialty:            form.specialty || null,
      referring_prescriber: form.referring_prescriber || null,
      service_lines:        form.lines,
      total_claimed:        total,
      additional_info:      form.additional_info || null,
      status,
      submitted_at:         status === 'submitted' ? new Date().toISOString() : null,
    });

    await fetchClaims();
    setView('list');
    setStep(1);
    setForm({ patient_name:'', client_id:'', patient_dob:'', approval_type:'post', specialty:'', referring_prescriber:'', additional_info:'', lines:[emptyLine()] });
    setSubmitting(false);
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',           label: t.tabs.all,           count: claims.length },
    { key: 'pending',       label: t.tabs.pending,       count: summary.pending.count },
    { key: 'paid',          label: t.tabs.paid,          count: summary.paid.count },
    { key: 'partial',       label: t.tabs.partial,       count: summary.partial.count },
    { key: 'rejected',      label: t.tabs.rejected,      count: summary.rejected.count },
    { key: 'review_needed', label: t.tabs.review_needed, count: summary.review_needed.count },
    { key: 'draft',         label: t.tabs.draft,         count: summary.draft.count },
  ];

  // ── NEW CLAIM FORM ──────────────────────────────────────────────────────────

  if (view === 'new') return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-4xl bg-[#050505] rounded-[2.5rem] border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-8">

        <div className="m-4 sm:m-6 mb-0 p-5 bg-black/60 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">PFSI / IFHP</span>
            </div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tight">{t.form.title}</h1>
          </div>
          <button onClick={() => { setView('list'); setStep(1); }} className="text-white/30 hover:text-white/60 text-xs">{t.form.cancel}</button>
        </div>

        {/* Step indicator */}
        <div className="mx-6 flex gap-2">
          {t.form.stepLabels.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i + 1 <= step ? 'bg-primary' : 'bg-white/10'}`} />
          ))}
        </div>
        <div className="mx-6 flex justify-between">
          {t.form.steps.map((label, i) => (
            <span key={i} className={`text-[10px] font-bold uppercase tracking-wide ${i + 1 === step ? 'text-primary' : 'text-white/25'}`}>{label}</span>
          ))}
        </div>

        <div className="mx-6 flex flex-col gap-4">

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className={labelCls}>{t.form.fullName}</label>
                    <input className={inputCls} value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder={t.form.namePlaceholder} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{t.form.ifhpId}</label>
                    <input className={inputCls} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} placeholder={t.form.idPlaceholder} maxLength={16} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{t.form.dob}</label>
                    <input type="date" className={inputCls} value={form.patient_dob} onChange={e => setForm(f => ({ ...f, patient_dob: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
                <p className={labelCls}>{t.form.approvalType}</p>
                <div className="flex gap-3">
                  {(['prior', 'post'] as const).map(ap => (
                    <button key={ap} onClick={() => setForm(f => ({ ...f, approval_type: ap }))}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${form.approval_type === ap ? 'bg-primary/20 border-primary/50 text-primary' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                      {ap === 'prior' ? t.approval.prior : t.approval.post}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>{t.form.specialty}</label>
                    <input className={inputCls} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder={t.form.specialtyPh} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>{t.form.referrer}</label>
                    <input className={inputCls} value={form.referring_prescriber} onChange={e => setForm(f => ({ ...f, referring_prescriber: e.target.value }))} placeholder={t.form.referrerPh} />
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} disabled={!form.patient_name.trim() || !form.client_id.trim()}
                className="bg-primary text-black font-black h-12 rounded-2xl disabled:opacity-40">
                {t.form.continue} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className={labelCls}>{t.form.serviceLines}</p>
                  <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}
                    className="flex items-center gap-1 text-primary text-xs font-bold hover:text-primary/70">
                    <Plus className="w-3.5 h-3.5" /> {t.form.add}
                  </button>
                </div>
                <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_55px_1.5fr_55px_90px_28px] gap-2 px-1">
                  {t.form.headers.map(h => (
                    <span key={h} className="text-[9px] uppercase font-bold text-white/20">{h}</span>
                  ))}
                </div>
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_55px_1.5fr_55px_90px_28px] gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                    <input className={inputCls} value={l.invoice_number ?? ''} onChange={e => updateLine(i, 'invoice_number', e.target.value)} placeholder="INV-001" />
                    <input type="date" className={inputCls} value={l.date_of_service ?? ''} onChange={e => updateLine(i, 'date_of_service', e.target.value)} />
                    <input className={inputCls} value={l.fee_code ?? ''} onChange={e => updateLine(i, 'fee_code', e.target.value)} placeholder="00123" />
                    <input className={inputCls} value={l.units_of_time ?? ''} onChange={e => updateLine(i, 'units_of_time', e.target.value)} placeholder="1" />
                    <input className={inputCls} value={l.icd_code ?? ''} onChange={e => updateLine(i, 'icd_code', e.target.value)} placeholder="J06.9" />
                    <input className={inputCls} value={l.prescriber_designation ?? 'MD'} onChange={e => updateLine(i, 'prescriber_designation', e.target.value)} placeholder="MD" />
                    <input type="number" step="0.01" className={inputCls} value={l.amount ?? ''} onChange={e => updateLine(i, 'amount', parseFloat(e.target.value) || undefined)} placeholder="0.00" />
                    {form.lines.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))} className="text-red-400/50 hover:text-red-400 self-center text-xs">✕</button>
                    )}
                  </div>
                ))}
                <div className="flex justify-end pt-1 border-t border-white/5">
                  <span className="text-sm font-black text-primary">TOTAL : ${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 space-y-1.5">
                <label className={labelCls}>{t.form.clinicalDetails}</label>
                <textarea rows={3} className={inputCls + ' resize-none'} value={form.additional_info}
                  onChange={e => setForm(f => ({ ...f, additional_info: e.target.value }))}
                  placeholder={t.form.clinicalPh} />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 border border-white/10 text-white/40 rounded-2xl h-12">{t.form.back}</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-primary text-black font-black h-12 rounded-2xl">
                  {t.form.review} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (() => {
            const validation = validatePFSIClaim({ ...form, service_lines: form.lines });
            return (
              <div className="flex flex-col gap-4">
                <ValidationPanel result={{ ...validation, issues: validation.issues }} />
                <div className="bg-black/40 border border-primary/20 rounded-2xl p-5 space-y-3">
                  <p className={labelCls + ' text-primary/60'}>{t.form.reviewTitle}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className={labelCls}>{t.form.patient}</p><p className="text-sm font-bold text-white">{form.patient_name}</p></div>
                    <div><p className={labelCls}>{t.form.ifhpIdLabel}</p><p className="text-sm font-mono text-primary">{form.client_id}</p></div>
                    <div><p className={labelCls}>{t.form.birth}</p><p className="text-sm text-white/70">{form.patient_dob || '—'}</p></div>
                    <div><p className={labelCls}>{t.form.approvalLabel}</p><p className="text-sm text-white/70">{form.approval_type === 'prior' ? t.approval.prior : t.approval.post}</p></div>
                  </div>
                  <div className="pt-3 border-t border-white/5">
                    <p className={labelCls + ' mb-2'}>{t.form.servicesLabel(form.lines.length)}</p>
                    {form.lines.map((l, i) => (
                      <div key={i} className="flex justify-between text-xs text-white/60 py-1 border-b border-white/5">
                        <span>{l.date_of_service || '—'} · {l.icd_code || l.fee_code || '—'}</span>
                        <span className="text-green-400 font-bold">${(l.amount ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-end mt-2">
                      <span className="text-base font-black text-primary">TOTAL : ${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => saveClaim('submitted')} disabled={submitting || !validation.isValid}
                    className="bg-primary text-black font-black h-12 rounded-2xl disabled:opacity-40">
                    {submitting ? t.form.saving : t.form.submitClaim}
                  </Button>
                  <Button onClick={() => saveClaim('draft')} disabled={submitting} variant="ghost"
                    className="border border-white/10 text-white/40 h-10 rounded-2xl text-sm">
                    {t.form.saveDraft}
                  </Button>
                  <Button onClick={() => setStep(2)} variant="ghost" className="text-white/25 text-xs h-8">{t.form.modify}</Button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  // ── COMMAND CENTER LIST ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        {/* Header */}
        <div className="relative z-10 m-6 p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter leading-none">{t.title}</h1>
              <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mt-0.5">
                {t.subtitle(claims.length, `$${summary.total_claimed.toFixed(2)}`)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/claims/reconciliation">
              <Button variant="ghost" className="gap-2 text-white/50 border border-white/10 bg-black/40 rounded-xl px-3 h-9 text-xs hover:text-white/80 hover:border-white/20">
                <BarChart3 className="w-3.5 h-3.5" /> {t.reconciliation}
              </Button>
            </Link>
            <Link href="/claims/pfsi-remittance">
              <Button variant="ghost" className="gap-2 text-white/50 border border-white/10 bg-black/40 rounded-xl px-3 h-9 text-xs hover:text-white/80 hover:border-white/20">
                <FileText className="w-3.5 h-3.5" /> {t.remittance}
              </Button>
            </Link>
            <Button onClick={() => setView('new')} className="gap-2 bg-primary text-black rounded-xl px-4 h-9 text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> {t.newClaim}
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-3 h-9 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 flex flex-col gap-4">

          {/* Summary cards */}
          <div className="flex gap-3 flex-wrap">
            {(['paid','partial','rejected','pending','review_needed'] as const).map(key => (
              <SummaryCard key={key} statusKey={key} label={t.statusLabels[key]} count={summary[key].count} amount={summary[key].amount}
                active={filter === key} onClick={() => setFilter(filter === key ? 'all' : key)} />
            ))}
            <div className="flex-1 min-w-[180px] p-4 rounded-2xl border border-white/8 bg-white/2 flex flex-col justify-between">
              <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/30 mb-3">{t.reconciliationBlock}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-[10px] text-white/40">{t.totalClaimed}</span><span className="text-sm font-bold text-white">${summary.total_claimed.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-white/40">{t.totalReceived}</span><span className="text-sm font-bold text-green-400">${summary.total_received.toFixed(2)}</span></div>
                <div className="w-full h-px bg-white/8 my-1" />
                <div className="flex justify-between"><span className="text-[10px] text-white/40">{t.gap}</span>
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
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-all
                  ${filter === tab.key ? 'bg-primary text-black' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
                {tab.label}
                {tab.count > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40'}`}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Claim list */}
          {loading ? (
            <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-white/20 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Shield className="w-10 h-10 text-white/10" />
              <p className="text-white/30 text-sm">{filter !== 'all' ? t.noClaimsFilter : t.noClaims}</p>
              {filter === 'all' && <Button onClick={() => setView('new')} className="bg-primary text-black mt-2 text-xs">{t.createClaim}</Button>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(claim => {
                const ds = getDisplayStatus(claim);
                const cfg = STATUS_CONFIG[ds] ?? STATUS_CONFIG.draft;
                const isExpanded = expanded === claim.id;
                const validation = validatePFSIClaim({
                  patient_name: claim.patient_name, client_id: claim.client_id,
                  patient_dob: claim.patient_dob, approval_type: claim.approval_type,
                  service_lines: claim.service_lines, additional_info: claim.additional_info,
                });
                const vSum = getPFSIValidationSummary(validation);

                return (
                  <div key={claim.id} className={`rounded-2xl border transition-all ${cfg.border} ${cfg.card}`}>
                    {/* Row */}
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                      onClick={() => setExpanded(isExpanded ? null : claim.id)}>
                      <div className="flex-1 min-w-0 grid grid-cols-[1.5fr_1fr_auto_auto] md:grid-cols-[2fr_1fr_1fr_auto_auto] items-center gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white/90 truncate">{claim.patient_name}</p>
                            {ds === 'draft' && <ValidationBadge errorCount={vSum.errorCount} warningCount={vSum.warningCount} />}
                          </div>
                          <p className="text-[10px] text-white/30 mt-0.5 font-mono">{claim.client_id ?? '—'}{claim.invoice_number ? ` · ${claim.invoice_number}` : ''}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Approbation</p>
                          <p className="text-xs text-white/60">{claim.approval_type === 'prior' ? t.approval.prior : t.approval.post}</p>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Réclamé</p>
                          <p className="text-sm font-bold text-white/80">${claim.total_claimed.toFixed(2)}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>{t.statusLabels[ds as keyof typeof t.statusLabels] ?? cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); handleGeneratePDF(claim); }}
                          title="PDF" className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-white/6 pt-3 space-y-4">
                        {ds === 'draft' && <ValidationPanel result={validation} compact={false} />}

                        {/* Service lines */}
                        {(claim.service_lines?.length ?? 0) > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">Lignes de service</p>
                            {claim.service_lines!.map((l, i) => (
                              <div key={i} className="flex justify-between text-xs text-white/50 py-1 border-b border-white/5">
                                <span>{l.date_of_service ?? '—'} · {l.icd_code || l.fee_code || '—'}</span>
                                <span className="text-white/70 font-mono">${(l.amount ?? 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Rejection info */}
                        {claim.rejection_reason && (
                          <div className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
                            <p className="text-[9px] text-red-400/50 uppercase tracking-wider mb-1">Motif de rejet</p>
                            <p className="text-xs text-red-400/80">{claim.rejection_code ? `[${claim.rejection_code}] ` : ''}{claim.rejection_reason}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          {ds === 'draft' && validation.isValid && (
                            <ActionBtn color="blue" onClick={() => handleSubmit(claim)} disabled={!!updating}>{t.actions.submit}</ActionBtn>
                          )}
                          {(ds === 'pending' || ds === 'approved') && (<>
                            <ActionBtn color="green"  onClick={() => updateStatus(claim, 'paid')}          disabled={!!updating}>{t.actions.markPaid}</ActionBtn>
                            <ActionBtn color="yellow" onClick={() => updateStatus(claim, 'partial')}       disabled={!!updating}>{t.actions.partial}</ActionBtn>
                            <ActionBtn color="red"    onClick={() => updateStatus(claim, 'rejected')}      disabled={!!updating}>{t.actions.rejected}</ActionBtn>
                            <ActionBtn color="purple" onClick={() => updateStatus(claim, 'review_needed')} disabled={!!updating}>{t.actions.review}</ActionBtn>
                          </>)}
                          {(ds === 'paid' || ds === 'partial' || ds === 'rejected' || ds === 'review_needed') && (
                            <ActionBtn color="gray" onClick={() => updateStatus(claim, 'draft')} disabled={!!updating}>{t.actions.backDraft}</ActionBtn>
                          )}
                          <button onClick={() => handleDelete(claim.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-red-500/15 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all ml-auto">
                            <Trash2 className="w-3 h-3" /> {t.actions.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ color, children, onClick, disabled }: {
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  const c = {
    blue:   'border-blue-500/20 text-blue-400 hover:bg-blue-500/10',
    green:  'border-green-500/20 text-green-400 hover:bg-green-500/10',
    yellow: 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10',
    red:    'border-red-500/20 text-red-400 hover:bg-red-500/10',
    purple: 'border-purple-500/20 text-purple-400 hover:bg-purple-500/10',
    gray:   'border-white/10 text-white/40 hover:bg-white/5',
  }[color];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 ${c}`}>
      {children}
    </button>
  );
}
