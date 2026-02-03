"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Download, Trash2, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";

interface PFSILine {
  invoice_number: string;
  date_of_service: string;
  fee_code: string;
  units_of_time: string;
  icd_code: string;
  prescriber_designation: string;
  amount: number;
}

interface FormData {
  approval_type: "prior" | "post";
  patient_name: string;
  client_id: string;
  dob: string;
  specialty: string;
  referring_prescriber: string;
  lines: PFSILine[];
  additional_info: string;
}

const emptyLine = (): PFSILine => ({
  invoice_number: "", date_of_service: "", fee_code: "", units_of_time: "",
  icd_code: "", prescriber_designation: "MD", amount: 0,
});

const inputCls = "w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40";
const labelCls = "text-[10px] uppercase font-bold text-white/35 tracking-wide";

const STATUS_STYLE: Record<string, string> = {
  draft:     "text-white/40 bg-white/5 border-white/10",
  submitted: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  approved:  "text-green-400 bg-green-500/10 border-green-500/30",
  rejected:  "text-red-400 bg-red-500/10 border-red-500/30",
  paid:      "text-primary bg-primary/10 border-primary/30",
};

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

interface PFSIClaim {
  id: string;
  status?: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  approval_type?: string;
  patient_name?: string;
  patient_ramq?: string;
  patient_dob?: string;
  notes?: string;
}

interface PFSIProfile {
  first_name?: string;
  last_name?: string;
  ramq_number?: string;
  address?: string;
  phone?: string;
  fax?: string;
  [key: string]: unknown;
}

export default function PFSIPage() {
  const supabase = createClient();
  const router = useRouter();
  const [claims, setClaims] = useState<PFSIClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new">("list");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<PFSIProfile | null>(null);

  const [form, setForm] = useState<FormData>({
    approval_type: "post",
    patient_name: "", client_id: "", dob: "",
    specialty: "", referring_prescriber: "",
    lines: [emptyLine()],
    additional_info: "",
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [{ data: inv }, { data: prof }, { data: prac }] = await Promise.all([
        supabase.from("invoices").select("*").eq("user_id", user.id).eq("partner_type", "pfsi").order("invoice_date", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("practice_settings").select("*").eq("user_id", user.id).single(),
      ]);
      if (inv) setClaims(inv);
      if (prof || prac) setProfile({ ...prof, ...prac });
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(() => form.lines.reduce((s, l) => s + (l.amount || 0), 0), [form.lines]);

  function updateLine(i: number, key: keyof PFSILine, val: string | number) {
    setForm(f => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [key]: val };
      return { ...f, lines };
    });
  }

  async function handleSave(status: "draft" | "submitted") {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const invoiceNumber = `PFSI-${Date.now().toString().slice(-8)}`;
      const payload = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        patient_name: form.patient_name,
        patient_ramq: form.client_id,
        patient_dob: form.dob,
        invoice_date: new Date().toISOString().slice(0, 10),
        total_amount: total,
        amount_paid: 0,
        status,
        partner_type: "pfsi",
        notes: JSON.stringify({
          approval_type: form.approval_type,
          specialty: form.specialty,
          referring_prescriber: form.referring_prescriber,
          lines: form.lines,
          additional_info: form.additional_info,
        }),
      };
      await supabase.from("invoices").insert(payload);
      await fetchData();
      setView("list");
      setStep(1);
      setForm({ approval_type: "post", patient_name: "", client_id: "", dob: "", specialty: "", referring_prescriber: "", lines: [emptyLine()], additional_info: "" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGeneratePDF(claim: PFSIClaim) {
    const { generatePFSIPDF } = await import("@/lib/pdf/pfsi");
    const extra = claim.notes ? JSON.parse(claim.notes) : {};
    const pdf = generatePFSIPDF({
      approval_type: extra.approval_type ?? "post",
      patient_name: claim.patient_name ?? "",
      client_id: claim.patient_ramq ?? "",
      dob: claim.patient_dob ?? "",
      specialty: extra.specialty ?? "",
      referring_prescriber: extra.referring_prescriber ?? "",
      provider_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "",
      provider_number: profile?.ramq_number ?? "",
      provider_address: profile?.address ?? "",
      provider_city: "",
      provider_province: "QC",
      provider_postal: "",
      provider_phone: profile?.phone ?? "",
      provider_fax: "",
      lines: extra.lines ?? [],
      additional_info: extra.additional_info ?? "",
    });
    pdf.save(`PFSI-${claim.patient_name?.replace(/\s+/g, "_")}-${claim.invoice_date}.pdf`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette demande?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    setClaims(c => c.filter(x => x.id !== id));
  }

  if (view === "new") return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-4xl bg-[#050505] rounded-[2.5rem] border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-8">

        {/* Header */}
        <div className="m-4 sm:m-6 mb-0 p-5 bg-black/60 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">PFSI / IFHP</span>
            </div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tight">Nouvelle demande de règlement</h1>
          </div>
          <button onClick={() => { setView("list"); setStep(1); }} className="text-white/30 hover:text-white/60 text-xs">Annuler</button>
        </div>

        {/* Step indicator */}
        <div className="mx-6 flex gap-2">
          {["Patient", "Services", "Révision"].map((label, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i + 1 <= step ? "bg-primary" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="mx-6 flex justify-between">
          {["1. Patient", "2. Services", "3. Révision"].map((label, i) => (
            <span key={i} className={`text-[10px] font-bold uppercase tracking-wide ${i + 1 === step ? "text-primary" : "text-white/25"}`}>{label}</span>
          ))}
        </div>

        <div className="mx-6 flex flex-col gap-4">
          {/* ── STEP 1: Patient ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelCls}>Nom complet du patient</label>
                    <input className={inputCls} value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder="Nom Prénom" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Numéro d&apos;ID client (IFHP / PFSI)</label>
                    <input className={inputCls} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} placeholder="12 caractères" maxLength={16} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Date de naissance</label>
                    <input type="date" className={inputCls} value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Type d&apos;approbation</p>
                <div className="flex gap-3">
                  {(["prior", "post"] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, approval_type: t }))}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${form.approval_type === t ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                      {t === "prior" ? "Préalable" : "Postérieure"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Spécialité (si applicable)</label>
                    <input className={inputCls} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ex: Médecine générale" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Médecin référent (si spécialiste)</label>
                    <input className={inputCls} value={form.referring_prescriber} onChange={e => setForm(f => ({ ...f, referring_prescriber: e.target.value }))} placeholder="Dr. Nom" />
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="bg-primary text-black font-black h-12 rounded-2xl">
                Continuer <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Services ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wide">Lignes de service</p>
                  <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))}
                    className="flex items-center gap-1 text-primary text-xs font-bold hover:text-primary/70">
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>

                {/* Column headers */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_60px_1.5fr_60px_90px_30px] gap-2">
                  {["Nº facture", "Date service", "Code honor.", "Unités", "CIM-9/10 / Diagnostic", "Désig.", "Montant", ""].map(h => (
                    <span key={h} className="text-[9px] uppercase font-bold text-white/25">{h}</span>
                  ))}
                </div>

                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_60px_1.5fr_60px_90px_30px] gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                    <input className={inputCls} value={l.invoice_number} onChange={e => updateLine(i, "invoice_number", e.target.value)} placeholder="INV-001" />
                    <input type="date" className={inputCls} value={l.date_of_service} onChange={e => updateLine(i, "date_of_service", e.target.value)} />
                    <input className={inputCls} value={l.fee_code} onChange={e => updateLine(i, "fee_code", e.target.value)} placeholder="00123" />
                    <input className={inputCls} value={l.units_of_time} onChange={e => updateLine(i, "units_of_time", e.target.value)} placeholder="1" />
                    <input className={inputCls} value={l.icd_code} onChange={e => updateLine(i, "icd_code", e.target.value)} placeholder="J06.9 — Rhino..." />
                    <input className={inputCls} value={l.prescriber_designation} onChange={e => updateLine(i, "prescriber_designation", e.target.value)} placeholder="MD" />
                    <input type="number" className={inputCls} value={l.amount || ""} onChange={e => updateLine(i, "amount", parseFloat(e.target.value) || 0)} placeholder="0.00" />
                    {form.lines.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}
                        className="text-red-400/50 hover:text-red-400 text-xs self-center">✕</button>
                    )}
                  </div>
                ))}

                <div className="flex justify-end pt-2 border-t border-white/5">
                  <span className="text-sm font-black text-primary">TOTAL: ${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 space-y-1.5">
                <label className={labelCls}>Détails cliniques / justification (section 4)</label>
                <textarea rows={3} className={inputCls + " resize-none"} value={form.additional_info}
                  onChange={e => setForm(f => ({ ...f, additional_info: e.target.value }))}
                  placeholder="Fournir les détails cliniques ou la justification..." />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 border border-white/10 text-white/40 rounded-2xl h-12">Retour</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-primary text-black font-black h-12 rounded-2xl">
                  Réviser <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-primary/20 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest">Révision de la demande</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className={labelCls}>Patient</p><p className="text-sm font-bold text-white">{form.patient_name}</p></div>
                  <div><p className={labelCls}>ID Client (IFHP)</p><p className="text-sm font-mono text-primary">{form.client_id}</p></div>
                  <div><p className={labelCls}>Date de naissance</p><p className="text-sm text-white/70">{form.dob}</p></div>
                  <div><p className={labelCls}>Type d&apos;approbation</p><p className="text-sm text-white/70 capitalize">{form.approval_type === "prior" ? "Préalable" : "Postérieure"}</p></div>
                  {form.specialty && <div><p className={labelCls}>Spécialité</p><p className="text-sm text-white/70">{form.specialty}</p></div>}
                </div>
                <div className="pt-3 border-t border-white/5">
                  <p className={labelCls + " mb-2"}>Services ({form.lines.length} ligne{form.lines.length > 1 ? "s" : ""})</p>
                  {form.lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs text-white/60 py-1 border-b border-white/5">
                      <span>{l.date_of_service} — {l.icd_code || l.fee_code || "—"}</span>
                      <span className="text-green-400 font-bold">${(l.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-end mt-2">
                    <span className="text-base font-black text-primary">TOTAL: ${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => handleSave("submitted")} disabled={submitting}
                  className="bg-primary text-black font-black h-12 rounded-2xl text-sm">
                  {submitting ? "Enregistrement..." : "Soumettre la demande"}
                </Button>
                <Button onClick={() => handleSave("draft")} disabled={submitting} variant="ghost"
                  className="border border-white/10 text-white/40 h-10 rounded-2xl text-sm">
                  Sauvegarder comme brouillon
                </Button>
                <Button onClick={() => setStep(2)} variant="ghost" className="text-white/25 text-xs h-8">← Modifier</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-6xl bg-[#050505] rounded-[2.5rem] border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-6">

        {/* Header */}
        <div className="m-4 sm:m-6 mb-0 p-5 bg-black/60 border border-white/10 rounded-2xl flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter leading-none">PFSI / IFHP</h1>
              <p className="text-xs text-white/30 mt-0.5">Programme fédéral de santé intérimaire · Medavie Blue Cross</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setView("new")} className="bg-primary text-black rounded-xl px-4 h-9 text-xs font-bold gap-2">
              <Plus className="w-3.5 h-3.5" /> Nouvelle demande
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="border border-white/10 text-white/40 rounded-xl px-4 h-9 text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 sm:mx-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Demandes", value: claims.length, color: "text-primary" },
            { label: "Soumises", value: claims.filter(c => c.status === "submitted").length, color: "text-blue-400" },
            { label: "Approuvées", value: claims.filter(c => c.status === "approved").length, color: "text-green-400" },
            { label: "Total réclamé", value: `$${claims.reduce((s, c) => s + (c.total_amount || 0), 0).toFixed(2)}`, color: "text-primary" },
          ].map(s => (
            <div key={s.label} className="bg-black/40 border border-white/8 rounded-2xl p-4">
              <p className="text-[9px] uppercase font-bold text-white/25 mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="mx-4 sm:mx-6 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : claims.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Aucune demande PFSI enregistrée</p>
              <Button onClick={() => setView("new")} className="bg-primary text-black mt-4 text-xs">Créer une demande</Button>
            </div>
          ) : claims.map(claim => {
            const extra = claim.notes ? JSON.parse(claim.notes) : {};
            return (
              <div key={claim.id} className="bg-black/40 border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all group">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-[110px]">
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Nº demande</p>
                    <p className="text-sm font-black text-primary">{claim.invoice_number}</p>
                    <p className="text-[10px] text-white/25">{extra.approval_type === "prior" ? "Préalable" : "Postérieure"}</p>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Patient</p>
                    <p className="text-sm font-bold text-white">{claim.patient_name}</p>
                    <p className="text-[10px] font-mono text-white/30">{claim.patient_ramq}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Date</p>
                    <p className="text-sm text-white/60">{fmtDate(claim.invoice_date)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Montant</p>
                    <p className="text-base font-black text-primary">${(claim.total_amount || 0).toFixed(2)}</p>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase ${STATUS_STYLE[claim.status ?? ""] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                    {claim.status}
                  </span>
                  <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleGeneratePDF(claim)} title="Télécharger PDF"
                      className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(claim.id)} title="Supprimer"
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
