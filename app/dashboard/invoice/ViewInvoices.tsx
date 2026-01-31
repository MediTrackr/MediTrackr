"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Edit, Trash2, Plus } from "lucide-react";

export default function ViewInvoicesPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('invoice_date', { ascending: false });
        
        if (data) setInvoices(data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'overdue': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'draft': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
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
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">
            View Invoices
          </h1>
          <div className="flex gap-3">
            <Link href="/invoices/new">
              <Button className="gap-2 bg-primary text-black rounded-xl px-4 h-10 font-bold">
                <Plus className="w-4 h-4" /> New Invoice
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8">
            
            {loading ? (
              <div className="text-center text-white/40 py-12">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">No invoices found</p>
                <Link href="/invoices/new">
                  <Button className="bg-primary text-black">Create Your First Invoice</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="card-medical p-6 border-l-4 border-primary hover:border-primary/60 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Invoice #</p>
                          <p className="text-sm font-bold text-primary">{invoice.invoice_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Patient</p>
                          <p className="text-sm text-white">{invoice.patient_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Date</p>
                          <p className="text-sm text-white">{invoice.invoice_date || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Amount</p>
                          <p className="text-sm font-bold text-green-400">${invoice.total_amount?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Status</p>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(invoice.status)}`}>
                            {invoice.status?.toUpperCase() || 'DRAFT'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-500/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}