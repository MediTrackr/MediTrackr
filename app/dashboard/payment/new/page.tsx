"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function NewPaymentPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<{ id: string; invoice_number?: string; patient_name?: string; total_amount?: number }[]>([]);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: "",
    payment_method: "bank_transfer",
    source: "ramq",
    invoice_id: "",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    async function loadInvoices() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, patient_name, total_amount')
        .eq('user_id', user.id)
        .neq('status', 'paid')
        .order('invoice_date', { ascending: false });
      if (data) setInvoices(data);
    }
    loadInvoices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        source: formData.source,
        invoice_id: formData.invoice_id || null,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
      });

      if (error) throw error;
      router.push('/dashboard/payment');
    } catch (err) {
      console.error(err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-4xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-green-400 uppercase italic tracking-tighter">Record Payment</h1>
          <Link href="/dashboard/payment">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            <div className="card-medical p-6 border-l-4 border-green-400">
              <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">Payment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Payment Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white"
                  >
                    <option value="ramq">RAMQ</option>
                    <option value="patient">Patient (Private)</option>
                    <option value="insurance">Private Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white"
                  >
                    <option value="bank_transfer">Bank Transfer (Virement)</option>
                    <option value="check">Check (Chèque)</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>

                {invoices.length > 0 && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Link to Invoice (optional)</label>
                    <select
                      value={formData.invoice_id}
                      onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                      className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white"
                    >
                      <option value="">— None —</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {inv.patient_name} (${inv.total_amount?.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Reference / Confirmation #</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="e.g., RAMQ-2026-XXXXX or cheque #1234"
                  />
                </div>
              </div>
            </div>

            <div className="card-medical p-6">
              <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Notes</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[100px]"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-500 text-black font-bold uppercase tracking-wider h-14 rounded-2xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Save Payment
              </Button>
              <Link href="/dashboard/payment" className="flex-1">
                <Button variant="outline" type="button" className="w-full h-14 rounded-2xl border-white/20">
                  Cancel
                </Button>
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
