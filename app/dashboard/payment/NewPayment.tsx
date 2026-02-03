"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, DollarSign, CreditCard, Banknote, Building2, FileCheck } from "lucide-react";

interface PendingInvoice {
  id: string;
  invoice_number?: string;
  patient_name?: string;
  total_amount?: number;
  amount_paid?: number;
}

const PAYMENT_METHODS = [
  { value: "cash",          label: "Comptant",       icon: <Banknote   className="w-4 h-4" /> },
  { value: "check",         label: "Chèque",         icon: <FileCheck  className="w-4 h-4" /> },
  { value: "credit_card",   label: "Carte crédit",   icon: <CreditCard className="w-4 h-4" /> },
  { value: "debit_card",    label: "Carte débit",    icon: <CreditCard className="w-4 h-4" /> },
  { value: "bank_transfer", label: "Virement",       icon: <Building2  className="w-4 h-4" /> },
  { value: "stripe",        label: "Stripe",         icon: <CreditCard className="w-4 h-4" /> },
  { value: "ramq",          label: "RAMQ",           icon: <FileCheck  className="w-4 h-4" /> },
];

export default function NewPaymentPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [saving, setSaving]       = useState(false);
  const [invoices, setInvoices]   = useState<PendingInvoice[]>([]);
  const [formData, setFormData]   = useState({
    invoice_id:       "",
    amount:           "",
    payment_method:   "bank_transfer",
    source:           "",
    payment_date:     new Date().toISOString().split("T")[0],
    reference_number: "",
    notes:            "",
  });

  useEffect(() => {
    async function loadInvoices() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, patient_name, total_amount, amount_paid")
        .eq("user_id", user.id)
        .in("status", ["pending", "overdue", "partial"]);

      if (data) setInvoices(data);
    }
    loadInvoices();
  }, [supabase, router]);

  function handleMethodChange(method: string) {
    const today = new Date().toISOString().split("T")[0];
    const autoRef = method === "ramq" ? `RAMQ-${today}` : "";
    setFormData(prev => ({ ...prev, payment_method: method, reference_number: autoRef }));
  }

  const selectedInvoice = invoices.find(i => i.id === formData.invoice_id);
  const outstanding = selectedInvoice
    ? (selectedInvoice.total_amount || 0) - (selectedInvoice.amount_paid || 0)
    : null;

  async function handleSubmit() {
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) { alert("Montant invalide"); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { error } = await supabase.from("payments").insert({
        user_id:          user.id,
        invoice_id:       formData.invoice_id || null,
        amount,
        payment_method:   formData.payment_method,
        source:           formData.source || null,
        payment_date:     formData.payment_date,
        reference_number: formData.reference_number || null,
        notes:            formData.notes || null,
      });
      if (error) throw error;

      if (formData.invoice_id && selectedInvoice) {
        const totalPaid  = (selectedInvoice.amount_paid || 0) + amount;
        const totalOwed  = selectedInvoice.total_amount || 0;
        const newStatus  = totalPaid >= totalOwed ? "paid" : "partial";
        await supabase
          .from("invoices")
          .update({ status: newStatus, amount_paid: totalPaid })
          .eq("id", formData.invoice_id);
      }

      router.push("/dashboard/payment");
    } catch (err) {
      console.error(err);
      alert("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-3xl bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <DollarSign size={400} className="text-green-400" />
        </div>

        {/* Header */}
        <div className="relative z-10 m-6 mb-0 p-5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-green-400 uppercase italic tracking-tighter">Enregistrer un paiement</h1>
            <p className="text-xs text-white/30 mt-0.5">Saisir un paiement reçu et mettre à jour la facture liée</p>
          </div>
          <Link href="/dashboard/payment">
            <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-9 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 mt-4 space-y-4">

          {/* Link to invoice */}
          <div className="card-medical p-6 border-l-4 border-primary">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Facture liée (optionnel)</h2>
            <select
              value={formData.invoice_id}
              onChange={e => setFormData(prev => ({ ...prev, invoice_id: e.target.value }))}
              className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white"
            >
              <option value="">— Paiement sans facture liée —</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number || inv.id.slice(0,8)} — {inv.patient_name || "—"} — ${((inv.total_amount || 0) - (inv.amount_paid || 0)).toFixed(2)} restant
                </option>
              ))}
            </select>
            {outstanding !== null && (
              <p className="text-[10px] text-blue-400/70 mt-2">
                Solde à recevoir : <span className="font-bold text-blue-400">${outstanding.toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Amount + Date */}
          <div className="card-medical p-6 border-l-4 border-green-400">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">Montant et date</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Montant reçu *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">$</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 pl-7 pr-4 p-3 rounded-xl text-sm text-white"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {outstanding !== null && parseFloat(formData.amount) > outstanding && (
                  <p className="text-[10px] text-yellow-400">⚠ Montant dépasse le solde de la facture</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Date du paiement *</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={e => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="card-medical p-6 border-l-4 border-primary">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Mode de paiement</h2>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleMethodChange(m.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formData.payment_method === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source + Reference */}
          <div className="card-medical p-6 border-l-4 border-white/10">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Référence et source</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  placeholder="ex. Patient, RAMQ, Assurance…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Numéro de référence</label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={e => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono"
                  placeholder="ex. RAMQ-2025-05-03"
                />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <label className="text-[9px] uppercase font-bold opacity-40">Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[60px]"
                placeholder="Notes internes…"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleSubmit}
              disabled={saving || !formData.amount}
              className="flex-1 bg-green-500 text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-green"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? "Enregistrement…" : "Enregistrer le paiement"}
            </Button>
            <Link href="/dashboard/payment" className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/20">Annuler</Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
