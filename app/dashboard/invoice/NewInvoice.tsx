"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import HealthCardScanner from "@/components/HealthCardScanner";

export default function NewInvoicePage() {
  const [formData, setFormData] = useState({
    patientName: "",
    patientRAMQ: "",
    // ... other fields
  });

  const handleHealthCardData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      patientName: data.fullName,
      patientRAMQ: data.memberId,
    }));
  };

  return (
    <div>
      <HealthCardScanner onDataExtracted={handleHealthCardData} />
      
      <input 
        value={formData.patientName}
        onChange={(e) => setFormData({...formData, patientName: e.target.value})}
        placeholder="Patient Name"
      />
      <input 
        value={formData.patientRAMQ}
        onChange={(e) => setFormData({...formData, patientRAMQ: e.target.value})}
        placeholder="RAMQ Number"
      />
    </div>
  );
}

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
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      {/* Outer Frame with Border */}
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
        
        {/* Background Logo */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-primary"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">
            New Invoice
          </h1>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Main Content Box */}
        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">
            
            {/* Patient Information */}
            <div className="card-medical p-6 border-l-4 border-primary">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
                Patient Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Patient Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">RAMQ Number</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="XXXX XXXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="card-medical p-6 border-l-4 border-green-400">
              <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">
                Invoice Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Invoice Number</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="INV-2025-XXX"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Invoice Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Due Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="card-medical p-6 border-l-4 border-orange-400">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                  Services / Procedures
                </h2>
                <Button 
                  onClick={addLineItem}
                  size="sm" 
                  className="gap-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20"
                >
                  <Plus className="w-4 h-4" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Description</label>
                      <input 
                        type="text" 
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="Service description"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Code</label>
                      <input 
                        type="text" 
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="00100"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Qty</label>
                      <input 
                        type="number" 
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        defaultValue={1}
                        min={1}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Price</label>
                      <input 
                        type="number" 
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button
                          onClick={() => removeLineItem(item.id)}
                          size="sm"
                          variant="ghost"
                          className="w-full text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <div className="text-right space-y-1">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">
                    ${calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card-medical p-6">
              <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
                Additional Notes
              </h2>
              <textarea 
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[100px]"
                placeholder="Any additional notes or comments..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-cyan">
                <Save className="w-5 h-5 mr-2" /> Save Invoice
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/20">
                  Cancel
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
