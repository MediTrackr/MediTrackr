"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import HealthCardScanner from "@/components/HealthCardScanner";

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  
  const [lineItems, setLineItems] = useState([
    { id: 1, description: "", code: "", quantity: 1, unitPrice: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientRAMQ: "",
    patientEmail: "",
    patientPhone: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    partnerType: "patient", // 'patient' | 'insurance' | 'ramq'
    partnerId: "",
    notes: ""
  });

  const handleHealthCardData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      patientName: data.fullName,
      patientRAMQ: data.memberId,
    }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      id: Date.now(), 
      description: "", 
      code: "", 
      quantity: 1, 
      unitPrice: 0 
    }]);
  };

  const removeLineItem = (id: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: number, field: string, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalAmount = calculateTotal();

      if (formData.partnerType === 'ramq') {
        const actCodes = lineItems.map(item => ({
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          fee: item.unitPrice
        }));

        const { error } = await supabase
          .from('ramq_claims')
          .insert({
            user_id: user.id,
            patient_name: formData.patientName,
            patient_ramq: formData.patientRAMQ,
            service_date: formData.invoiceDate,
            act_codes: actCodes,
            total_claimed: totalAmount,
            status: 'draft',
            notes: formData.notes,
          });

        if (error) throw error;
        alert('RAMQ Claim created successfully! No invoice generated.');
        router.push('/claims/ramq');
        return;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: formData.invoiceNumber,
          patient_name: formData.patientName,
          patient_ramq: formData.patientRAMQ,
          invoice_date: formData.invoiceDate,
          due_date: formData.dueDate,
          total_amount: totalAmount,
          amount_paid: 0,
          status: 'pending',
          partner_type: formData.partnerType,
          partner_id: formData.partnerId || null,
          notes: formData.notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const lineItemsData = lineItems.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        procedure_code: item.code,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);

      if (itemsError) throw itemsError;

      alert('Invoice created successfully!');
      router.push('/dashboard/invoice');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create invoice/claim');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
        
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-primary"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div className="absolute -top-6 left-0 right-0 h-32 bg-gradient-to-b from-white/5 via-white/2 to-transparent pointer-events-none" />
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">New Invoice</h1>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">
            <HealthCardScanner onDataExtracted={handleHealthCardData} />
            
            <div className="card-medical p-6 border-l-4 border-primary">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Patient Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Patient Name *</label>
                  <input type="text" value={formData.patientName} onChange={(e) => setFormData({...formData, patientName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="Full name" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">RAMQ Number</label>
                  <input type="text" value={formData.patientRAMQ} onChange={(e) => setFormData({...formData, patientRAMQ: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="XXXX XXXX XXXX" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Email</label>
                  <input type="email" value={formData.patientEmail} onChange={(e) => setFormData({...formData, patientEmail: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="patient@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Phone</label>
                  <input type="tel" value={formData.patientPhone} onChange={(e) => setFormData({...formData, patientPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="(514) 555-1234" />
                </div>
              </div>
            </div>

            <div className="card-medical p-6 border-l-4 border-green-400">
              <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">Billing Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Who is paying? *</label>
                  <select value={formData.partnerType} onChange={(e) => setFormData({...formData, partnerType: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                    <option value="patient">Patient (Private Pay / Stripe)</option>
                    <option value="ramq">RAMQ (QuÃ©bec Health Insurance)</option>
                    <option value="insurance">Private Insurance (Desjardins, etc.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">{formData.partnerType === 'ramq' ? 'Claim Number' : 'Invoice Number'}</label>
                  <input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="INV-2025-XXX" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Service Date</label>
                  <input type="date" value={formData.invoiceDate} onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                {formData.partnerType !== 'ramq' && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                  </div>
                )}
              </div>
            </div>

            <div className="card-medical p-6 border-l-4 border-orange-400">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Services / Procedures</h2>
                <Button onClick={addLineItem} size="sm" className="gap-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20"><Plus className="w-4 h-4" /> Add Line</Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Description</label>
                      <input type="text" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" placeholder="Service description" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Code</label>
                      <input type="text" value={item.code} onChange={(e) => updateLineItem(item.id, 'code', e.target.value)} className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" placeholder="00100" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Qty</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Price</label>
                      <input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" step="0.01" />
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button onClick={() => removeLineItem(item.id)} size="sm" variant="ghost" className="w-full text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end text-right space-y-1">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">${calculateTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSubmit} disabled={saving || !formData.patientName} className="flex-1 bg-primary text-black font-bold uppercase h-14 rounded-2xl shadow-cyan">
                <Save className="w-5 h-5 mr-2" /> {saving ? 'Saving...' : (formData.partnerType === 'ramq' ? 'Create RAMQ Claim' : 'Save Invoice')}
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/20">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
