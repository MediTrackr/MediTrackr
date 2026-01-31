"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, CreditCard, DollarSign } from "lucide-react";

export default function ViewPaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false });
        
        if (data) {
          setPayments(data);
          const total = data.reduce((sum, p) => sum + (p.amount || 0), 0);
          setTotalReceived(total);
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const getMethodColor = (method: string) => {
    switch(method) {
      case 'cash': return 'text-green-400';
      case 'credit_card': case 'stripe': return 'text-blue-400';
      case 'check': return 'text-orange-400';
      case 'bank_transfer': return 'text-purple-400';
      default: return 'text-white/60';
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
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-green-400"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-green-400"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-green-400 uppercase italic tracking-tighter">
            View Payments
          </h1>
          <div className="flex gap-3">
            <Link href="/payments/new">
              <Button className="gap-2 bg-green-500 text-black rounded-xl px-4 h-10 font-bold">
                <Plus className="w-4 h-4" /> New Payment
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
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">
            
            {/* Total Summary */}
            <div className="card-medical p-6 border-l-4 border-green-400 bg-green-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-bold text-green-400/60 mb-2">Total Payments Received</p>
                  <p className="text-4xl font-bold text-green-400">${totalReceived.toFixed(2)}</p>
                </div>
                <DollarSign className="w-16 h-16 text-green-400/20" />
              </div>
            </div>

            {loading ? (
              <div className="text-center text-white/40 py-12">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">No payments recorded</p>
                <Link href="/payments/new">
                  <Button className="bg-green-500 text-black">Record Your First Payment</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="card-medical p-6 border-l-4 border-green-400/50 hover:border-green-400 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Date</p>
                        <p className="text-sm text-white">{payment.payment_date || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Amount</p>
                        <p className="text-lg font-bold text-green-400">${payment.amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Method</p>
                        <p className={`text-sm font-medium ${getMethodColor(payment.payment_method)}`}>
                          {payment.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Reference</p>
                        <p className="text-sm text-white/60">{payment.reference_number || 'N/A'}</p>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40">{payment.notes}</p>
                      </div>
                    )}
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