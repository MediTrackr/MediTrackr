"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, Plane, Download, Trash2, ChevronRight,
  FileText, Search, CheckCircle2, Package,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackageForm {
  // Step 1 — selected invoice
  invoice_id: string;
  // Step 2 — insurance + travel (patient provides)
  insurer_name: string;
  contract_no: string;
  group_no: string;
  departure_date: string;
  return_date: string;
  trip_city_country: string;
  trip_reason: "vacation" | "work" | "school" | "medical" | "other";
  employer_name: string;
  trip_reason_other: string;
  bills_paid: "no" | "totally" | "partially";
  // Step 3 — extra medical context (optional)
  pre_medications: string;
  group_insurer: string;
  other_travel_insurer: string;
}

const defaultForm: PackageForm = {
  invoice_id: "",
  insurer_name: "", contract_no: "", group_no: "",
  departure_date: "", return_date: "", trip_city_country: "",
  trip_reason: "vacation", employer_name: "", trip_reason_other: "",
  bills_paid: "totally",
  pre_medications: "", group_insurer: "", other_travel_insurer: "",
};

const TRIP_REASONS = [
  { key: "vacation" as const, label: "Vacances / Séjour saisonnier" },
  { key: "work"    as const, label: "Travail" },
  { key: "school"  as const, label: "Études" },
  { key: "medical" as const, label: "Recevoir des soins" },
  { key: "other"   as const, label: "Autre" },
];

const STATUS_STYLE: Record<string, string> = {
  draft:     "text-white/40 bg-white/5 border-white/10",
  generated: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  sent:      "text-green-400 bg-green-500/10 border-green-500/30",
};

const inputCls = "w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40";
const labelCls = "text-[10px] uppercase font-bold text-white/35 tracking-wide";

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmt(n: number) { return `$${(n || 0).toFixed(2)}`; }

// ─── Main component ───────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number?: string;
  patient_name?: string;
  patient_ramq?: string;
  patient_dob?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount: number;
  amount_paid: number;
  status?: string;
  notes?: string;
  partner_type?: string;
}

type ProfileData = Record<string, unknown>;

export default function CanAssistancePage() {
  const supabase = createClient();
  const router = useRouter();

  const [packages, setPackages]   = useState<Invoice[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [profile, setProfile]     = useState<ProfileData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"list" | "new">("list");
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [form, setForm]           = useState<PackageForm>(defaultForm);

  const set = (key: keyof PackageForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [{ data: pkgs }, { data: inv }, { data: prof }, { data: prac }] = await Promise.all([
        supabase.from("invoices").select("*").eq("user_id", user.id).eq("partner_type", "canassistance_pkg").order("invoice_date", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, patient_name, patient_ramq, patient_dob, invoice_date, due_date, total_amount, amount_paid, status, notes, partner_type")
          .eq("user_id", user.id).not("partner_type", "eq", "canassistance_pkg").order("invoice_date", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("practice_settings").select("*").eq("user_id", user.id).single(),
      ]);
      if (pkgs) setPackages(pkgs);
      if (inv)  setInvoices(inv);
      setProfile({ ...(prof ?? {}), ...(prac ?? {}) });
    } finally {
      setLoading(false);
    }
  }

  // The invoice selected in step 1
  const selectedInvoice = useMemo(
    () => invoices.find(i => i.id === form.invoice_id) ?? null,
    [invoices, form.invoice_id]
  );

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.toLowerCase();
    return invoices.filter(i =>
      !q || i.patient_name?.toLowerCase().includes(q) || i.invoice_number?.toLowerCase().includes(q)
    );
  }, [invoices, invoiceSearch]);

  async function handleSave() {
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("invoices").insert({
        user_id: user.id,
        invoice_number: `CAN-${selectedInvoice.invoice_number}`,
        patient_name: selectedInvoice.patient_name,
        invoice_date: new Date().toISOString().slice(0, 10),
        total_amount: selectedInvoice.total_amount,
        amount_paid: selectedInvoice.amount_paid,
        status: "generated",
        partner_type: "canassistance_pkg",
        notes: JSON.stringify({ ...form, original_invoice: selectedInvoice }),
      });
      await fetchData();
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setView("list");
    setStep(1);
    setForm(defaultForm);
    setInvoiceSearch("");
  }

  async function handleDownload(pkg: Invoice) {
    const extra = pkg.notes ? JSON.parse(pkg.notes) : {};
    const inv   = extra.original_invoice ?? {};

    // Build line items from invoice notes if available
    type LineItemRaw = { description?: string; code?: string; procedure_code?: string; quantity?: number; unitPrice?: number; unit_price?: number };
    let lineItems: LineItemRaw[] = [];
    try {
      const invNotes = inv.notes ? JSON.parse(inv.notes) : {};
      lineItems = invNotes.lineItems ?? invNotes.line_items ?? [];
    } catch {}

    const providerName = [profile?.prefix, profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    type PlaceOfWork = { address?: { street?: string; city?: string; province?: string; postalCode?: string } };
    const places: PlaceOfWork[] = (() => { try { return JSON.parse((profile?.places_of_work as string) ?? "[]"); } catch { return []; } })();
    const firstPlace = places[0];
    const practiceAddr = firstPlace
      ? [firstPlace.address?.street, firstPlace.address?.city, firstPlace.address?.province, firstPlace.address?.postalCode].filter(Boolean).join(", ")
      : (profile?.practice_address as string) ?? "";

    const invoiceData = {
      provider_name: providerName || (profile?.practice_name as string) || "",
      provider_address: practiceAddr,
      provider_city: "",
      provider_province: "",
      provider_postal: "",
      provider_phone: (profile?.phone as string) ?? "",
      provider_fax: "",
      provider_license: (profile?.license_number as string) ?? (profile?.ramq_number as string) ?? "",
      patient_name: inv.patient_name ?? "",
      patient_dob: inv.patient_dob ?? "",
      patient_health_insurance: inv.patient_ramq ?? "",
      patient_address: "",
      invoice_number: inv.invoice_number ?? pkg.invoice_number ?? "",
      invoice_date: inv.invoice_date ?? pkg.invoice_date ?? "",
      service_date: inv.invoice_date ?? "",
      due_date: inv.due_date ?? "",
      diagnostic_code: "",
      diagnostic_desc: "",
      notes: inv.notes_text ?? "",
      line_items: lineItems.length ? lineItems.map((l) => ({
        description: l.description ?? "",
        procedure_code: l.code ?? l.procedure_code ?? "",
        quantity: l.quantity ?? 1,
        unit_price: l.unitPrice ?? l.unit_price ?? 0,
      })) : [],
      total_amount: inv.total_amount ?? 0,
      amount_paid: inv.amount_paid ?? 0,
      insurer_name: extra.insurer_name ?? "",
      policy_number: extra.contract_no ?? "",
    };

    const claimData = {
      insurer_name: extra.insurer_name ?? "",
      contract_no: extra.contract_no ?? "",
      group_no: extra.group_no ?? "",
      file_no: "",
      patient_name: inv.patient_name ?? "",
      last_name_on_card: inv.patient_name?.split(" ").slice(-1)[0] ?? "",
      health_insurance_letters: (inv.patient_ramq ?? "").slice(0, 4),
      health_insurance_numbers: (inv.patient_ramq ?? "").slice(4),
      dob: inv.patient_dob ?? "",
      sex: "M" as const,
      address_street: "",
      postal_code: "",
      telephone: "",
      email: "",
      departure_date: extra.departure_date ?? "",
      return_date: extra.return_date ?? "",
      trip_city_country: extra.trip_city_country ?? "",
      trip_reason: extra.trip_reason ?? "vacation",
      trip_reason_other: extra.trip_reason_other ?? "",
      employer_name: extra.employer_name ?? "",
      healthcare_reason: inv.notes_text ?? "Soins médicaux reçus lors d'un séjour à l'extérieur du Québec",
      is_accident: false,
      accident_type: "other" as const,
      accident_date: "",
      services_description: lineItems.map((l) => l.description).filter(Boolean).join("; ") || "Voir facture ci-jointe",
      service_city: extra.trip_city_country?.split(",")[0]?.trim() ?? "",
      service_province_state: "",
      service_country: extra.trip_city_country?.split(",").slice(-1)[0]?.trim() ?? "",
      days_hospitalized: "",
      amount_claimed: inv.total_amount ?? 0,
      currency: "CAD" as const,
      other_currency: "",
      bills_paid: extra.bills_paid ?? "totally",
      amount_paid_partial: "",
      pre_doctor_name: "", pre_doctor_address: "", pre_illness_nature: "",
      pre_last_visit: "", pre_hospital_illness: "", pre_hospital_name: "",
      pre_medications: extra.pre_medications ?? "",
      group_insurer: extra.group_insurer ?? "",
      group_policy_no: "",
      other_travel_insurer: extra.other_travel_insurer ?? "",
    };

    const [{ generateProviderInvoicePDF }, { generateCanAssistancePDF }] = await Promise.all([
      import("@/lib/pdf/provider-invoice"),
      import("@/lib/pdf/canassistance"),
    ]);

    const patientSlug = (inv.patient_name ?? "patient").replace(/\s+/g, "_");
    generateProviderInvoicePDF(invoiceData).save(`Facture_${patientSlug}_${inv.invoice_date ?? ""}.pdf`);
    // short delay so browser doesn't block second download
    await new Promise(r => setTimeout(r, 400));
    generateCanAssistancePDF(claimData).save(`CanAssistance_${patientSlug}_${inv.invoice_date ?? ""}.pdf`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce dossier?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    setPackages(p => p.filter(x => x.id !== id));
  }

  // ─── Form view ─────────────────────────────────────────────────────────────
  if (view === "new") return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-4xl bg-[#050505] rounded-[2.5rem] border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-8">

        {/* Header */}
        <div className="m-4 sm:m-6 mb-0 p-5 bg-black/60 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Plane className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] uppercase font-bold text-blue-400/60 tracking-widest">Croix Bleue / Blue Cross · CanAssistance</span>
            </div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tight">Nouveau dossier patient</h1>
            <p className="text-xs text-white/30 mt-0.5">Sélectionner une facture existante → ajouter les infos d&apos;assurance voyage → générer le dossier complet</p>
          </div>
          <button onClick={resetForm} className="text-white/30 hover:text-white/60 text-xs">Annuler</button>
        </div>

        {/* Step bar */}
        <div className="mx-6 flex gap-1.5">
          {["Facture", "Assurance & Voyage", "Révision"].map((lbl, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className={`h-1 rounded-full transition-all ${i + 1 <= step ? "bg-blue-500" : "bg-white/10"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wide ${i + 1 === step ? "text-blue-400" : "text-white/20"}`}>{i + 1}. {lbl}</span>
            </div>
          ))}
        </div>

        <div className="mx-6 flex flex-col gap-4">

          {/* ── STEP 1: Invoice selection ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-bold text-blue-400/60 uppercase tracking-wide">Sélectionner la facture du patient</p>
                <p className="text-xs text-white/30">Le patient a payé votre clinique. Vous allez générer une facture officielle + le formulaire CanAssistance pré-rempli pour qu&apos;il soumette à son assurance.</p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input className={inputCls + " pl-9"} placeholder="Rechercher patient ou nº de facture..."
                    value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredInvoices.length === 0 && (
                    <p className="text-center text-white/25 text-sm py-6">Aucune facture trouvée</p>
                  )}
                  {filteredInvoices.map(inv => (
                    <button key={inv.id} onClick={() => setForm(f => ({ ...f, invoice_id: inv.id }))}
                      className={`text-left p-4 rounded-xl border transition-all ${form.invoice_id === inv.id ? "bg-blue-600/20 border-blue-500/50" : "bg-black/30 border-white/8 hover:border-white/20"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {form.invoice_id === inv.id
                            ? <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                            : <FileText className="w-4 h-4 text-white/20 shrink-0" />}
                          <div>
                            <p className="text-sm font-bold text-white">{inv.patient_name}</p>
                            <p className="text-[10px] text-white/40">{inv.invoice_number} · {fmtDate(inv.invoice_date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-green-400">{fmtAmt(inv.total_amount)}</p>
                          <p className="text-[10px] text-white/30">{inv.amount_paid >= inv.total_amount ? "Payée" : inv.amount_paid > 0 ? "Partiel" : "Non payée"}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedInvoice && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{selectedInvoice.patient_name}</p>
                    <p className="text-xs text-white/40">{selectedInvoice.invoice_number} · {fmtAmt(selectedInvoice.total_amount)} · {fmtDate(selectedInvoice.invoice_date)}</p>
                  </div>
                </div>
              )}

              <Button onClick={() => setStep(2)} disabled={!form.invoice_id}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-black h-12 rounded-2xl">
                Continuer <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Insurance + Travel ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-bold text-blue-400/60 uppercase tracking-wide">Informations d&apos;assurance voyage</p>
                <p className="text-xs text-white/30">Le patient vous fournit ces informations figurant sur sa carte d&apos;assurance.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelCls}>Nom de l&apos;assureur</label>
                    <input className={inputCls} value={form.insurer_name} onChange={set("insurer_name")} placeholder="Ex: Desjardins, SSQ, Industrielle Alliance..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Nº de contrat / certificat</label>
                    <input className={inputCls} value={form.contract_no} onChange={set("contract_no")} placeholder="0000000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Nº de groupe (si disponible)</label>
                    <input className={inputCls} value={form.group_no} onChange={set("group_no")} placeholder="G-0000" />
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-bold text-blue-400/60 uppercase tracking-wide">Détails du voyage</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Date de départ du Québec</label>
                    <input type="date" className={inputCls} value={form.departure_date} onChange={set("departure_date")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Date de retour au Québec</label>
                    <input type="date" className={inputCls} value={form.return_date} onChange={set("return_date")} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelCls}>Lieu du séjour (ville, pays)</label>
                    <input className={inputCls} value={form.trip_city_country} onChange={set("trip_city_country")} placeholder="Ex: Miami, États-Unis" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelCls}>Motif du séjour</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRIP_REASONS.map(r => (
                        <button key={r.key} onClick={() => setForm(f => ({ ...f, trip_reason: r.key }))}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${form.trip_reason === r.key ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.trip_reason === "work" && (
                    <div className="col-span-2 space-y-1.5">
                      <label className={labelCls}>Nom de l&apos;employeur</label>
                      <input className={inputCls} value={form.employer_name} onChange={set("employer_name")} />
                    </div>
                  )}
                  {form.trip_reason === "other" && (
                    <div className="col-span-2 space-y-1.5">
                      <label className={labelCls}>Précisez</label>
                      <input className={inputCls} value={form.trip_reason_other} onChange={set("trip_reason_other")} />
                    </div>
                  )}
                  <div className="col-span-2 space-y-1.5">
                    <label className={labelCls}>Factures payées à la clinique?</label>
                    <div className="flex gap-2">
                      {[["totally", "Oui, en totalité"], ["partially", "Partiellement"], ["no", "Non"]] .map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(f => ({ ...f, bills_paid: val as PackageForm["bills_paid"] }))}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${form.bills_paid === val ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "border-white/10 text-white/30"}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-bold text-white/30 uppercase tracking-wide">Optionnel — contexte médical</p>
                <div className="space-y-1.5">
                  <label className={labelCls}>Médicaments pris dans les 6 mois précédant le départ</label>
                  <textarea rows={2} className={inputCls + " resize-none"} value={form.pre_medications} onChange={set("pre_medications")} placeholder="Nom, posologie..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Autre assurance collective</label>
                    <input className={inputCls} value={form.group_insurer} onChange={set("group_insurer")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Autre assurance voyage</label>
                    <input className={inputCls} value={form.other_travel_insurer} onChange={set("other_travel_insurer")} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 border border-white/10 text-white/40 rounded-2xl h-12">Retour</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black h-12 rounded-2xl">
                  Réviser <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && selectedInvoice && (
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-5 space-y-4">
                <p className="text-[10px] uppercase font-black text-blue-400/60 tracking-widest">Dossier à générer</p>

                <div className="flex items-start gap-3 p-4 bg-black/40 rounded-xl border border-white/8">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">Facture officielle du fournisseur</p>
                    <p className="text-xs text-white/40">Formatée selon les exigences CanAssistance — à joindre à la demande</p>
                    <p className="text-xs text-white/60 mt-1">{selectedInvoice.patient_name} · {fmtAmt(selectedInvoice.total_amount)} · {fmtDate(selectedInvoice.invoice_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-black/40 rounded-xl border border-white/8">
                  <Plane className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">Formulaire CanAssistance pré-rempli</p>
                    <p className="text-xs text-white/40">Patient doit signer + joindre preuves de voyage</p>
                    <p className="text-xs text-white/60 mt-1">{form.insurer_name || "—"} · Nº {form.contract_no || "—"} · {form.departure_date} → {form.return_date}</p>
                    <p className="text-xs text-white/40 mt-0.5">{form.trip_city_country || "Lieu non précisé"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-white/25 leading-relaxed">
                    Deux fichiers PDF seront téléchargés. Le patient doit signer le formulaire CanAssistance, y joindre la facture, les preuves de paiement, et les preuves de voyage, puis soumettre à CanAssistance via canassistance.com ou par courrier.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleSave} disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 rounded-2xl gap-2">
                  <Package className="w-4 h-4" />
                  {submitting ? "Génération..." : "Générer & enregistrer le dossier"}
                </Button>
                <Button onClick={() => setStep(2)} variant="ghost" className="text-white/25 text-xs h-8">← Modifier</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4 pt-6">
      <div className="w-full max-w-6xl bg-[#050505] rounded-[2.5rem] border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col gap-4 pb-6">

        <div className="m-4 sm:m-6 mb-0 p-5 bg-black/60 border border-white/10 rounded-2xl flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3">
            <Plane className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-2xl font-black text-blue-400 uppercase italic tracking-tighter leading-none">Croix Bleue / CanAssistance</h1>
              <p className="text-xs text-white/30 mt-0.5">Dossiers assurance voyage · Facture + formulaire pré-rempli</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setView("new")} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 h-9 text-xs font-bold gap-2">
              <Plus className="w-3.5 h-3.5" /> Nouveau dossier
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="border border-white/10 text-white/40 rounded-xl px-4 h-9 text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 sm:mx-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Dossiers générés", value: packages.length, color: "text-blue-400" },
            { label: "Total réclamé", value: fmtAmt(packages.reduce((s, p) => s + (p.total_amount || 0), 0)), color: "text-green-400" },
            { label: "Factures sources", value: invoices.length, color: "text-white/50" },
          ].map(s => (
            <div key={s.label} className="bg-black/40 border border-white/8 rounded-2xl p-4">
              <p className="text-[9px] uppercase font-bold text-white/25 mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* How it works hint */}
        {packages.length === 0 && !loading && (
          <div className="mx-4 sm:mx-6 bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
            <p className="text-xs font-bold text-blue-400/70 uppercase tracking-wide mb-3">Comment ça fonctionne</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                ["1. Patient paie", "Le patient règle sa facture à la clinique (comptant, carte, etc.)"],
                ["2. Générer le dossier", "Sélectionner la facture, ajouter les infos d'assurance voyage → Meditrackr prépare 2 PDFs"],
                ["3. Patient soumet", "Facture officielle + formulaire CanAssistance pré-rempli → patient envoie à son assureur pour remboursement"],
              ].map(([title, desc]) => (
                <div key={title as string} className="space-y-1">
                  <p className="text-xs font-black text-blue-300">{title as string}</p>
                  <p className="text-xs text-white/30 leading-relaxed">{desc as string}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Package list */}
        <div className="mx-4 sm:mx-6 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm mb-1">Aucun dossier généré</p>
              <p className="text-white/20 text-xs mb-4">Créez un dossier depuis une facture existante</p>
              <Button onClick={() => setView("new")} className="bg-blue-600 text-white text-xs">Créer un dossier</Button>
            </div>
          ) : packages.map(pkg => {
            const extra = pkg.notes ? JSON.parse(pkg.notes) : {};
            return (
              <div key={pkg.id} className="bg-black/40 border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all group">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-[120px]">
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Dossier</p>
                    <p className="text-sm font-black text-blue-400">{pkg.invoice_number}</p>
                    <p className="text-[10px] text-white/25">{fmtDate(pkg.invoice_date)}</p>
                  </div>
                  <div className="flex-1 min-w-[130px]">
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Patient</p>
                    <p className="text-sm font-bold text-white">{pkg.patient_name}</p>
                    <p className="text-[10px] text-white/30">{extra.insurer_name || "—"} · {extra.contract_no || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Destination</p>
                    <p className="text-sm text-white/60">{extra.trip_city_country || "—"}</p>
                    <p className="text-[10px] text-white/30">{extra.departure_date} → {extra.return_date}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/25 mb-0.5">Montant</p>
                    <p className="text-base font-black text-green-400">{fmtAmt(pkg.total_amount)}</p>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase ${STATUS_STYLE[pkg.status ?? ""] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                    {pkg.status === "generated" ? "✓ Généré" : pkg.status}
                  </span>
                  <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(pkg)} title="Télécharger (2 PDFs)"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold">
                      <Download className="w-3.5 h-3.5" /> 2 PDFs
                    </button>
                    <button onClick={() => handleDelete(pkg.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400">
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
