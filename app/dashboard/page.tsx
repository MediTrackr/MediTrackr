"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Sidebar from "@/components/dashboard/Sidebar";
import StatCard from "@/components/dashboard/StatCard";
import { DollarSign, Wallet, Clock, ArrowDownToLine, LayoutList, FilePlus, Database, FileText, UploadCloud } from "lucide-react";
import Link from "next/link";

// --- CATEGORIZED NAVIGATION ---
const actionCards = [
  { title: "New Invoice", href: "/dashboard/invoice/new", desc: "Draft a new bill", icon: FilePlus },
  { title: "New Payment", href: "/dashboard/payment/new", desc: "Generate instant QR", icon: ArrowDownToLine },
  { title: "New Budget", href: "/dashboard/budget/new", desc: "Initialize allocation", icon: FilePlus },
];

const managementCards = [
  { title: "Invoices", href: "/dashboard/invoice", desc: "Track receivables", icon: LayoutList },
  { title: "Payments & Receipts", href: "/dashboard/payments", desc: "Unified ledger", icon: Database },
  { title: "Budgets", href: "/dashboard/budget", desc: "Review performance", icon: LayoutList },
];

const expenseModule = [
  { title: "New Expense Report", href: "/dashboard/expense-report/new", desc: "Create new document", icon: FileText, color: "orange" },
  { title: "Expense Archives", href: "/dashboard/expense-report", desc: "History & CSV Uploads", icon: UploadCloud, color: "cyan" },
];

export default function Dashboard() {
  const supabase = createClient();
  const [profile, setProfile] = useState({ prefix: "Dr.", name: "Micah" });
  const [stats, setStats] = useState({ amountBilled: 0, amountPerceived: 0, pendingPayment: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile({ prefix: profileData.prefix || "Dr.", name: profileData.last_name || "User" });
        const { data: invoices } = await supabase.from('invoices').select('total_amount, amount_paid').eq('user_id', user.id);
        if (invoices) {
          const billed = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
          const perceived = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
          setStats({ amountBilled: billed, amountPerceived: perceived, pendingPayment: billed - perceived });
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div className="relative z-10 flex flex-col h-full p-6 space-y-6">
          <DashboardHeader />

          {/* GREETING */}
          <div className="p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-center">
            <h1 className="text-3xl font-black text-primary italic uppercase tracking-tighter italic">
              {profile.prefix} {profile.name}'s Dashboard
            </h1>
          </div>

          <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <Sidebar />

                <div className="lg:col-span-3 space-y-10">
                  {/* STATS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="Amount Billed" value={loading ? "..." : `$${stats.amountBilled.toLocaleString()}`} icon={DollarSign} className="shadow-cyan" />
                    <StatCard title="Amount Perceived" value={loading ? "..." : `$${stats.amountPerceived.toLocaleString()}`} icon={Wallet} className="shadow-green" />
                    <StatCard title="Pending Payment" value={loading ? "..." : `$${stats.pendingPayment.toLocaleString()}`} icon={Clock} className="shadow-orange" />
                  </div>

                  {/* 1. PRIMARY ACTIONS */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Operations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {actionCards.map((card, i) => (
                        <Link href={card.href} key={i} className="group h-full">
                          <div className="card-medical p-5 flex flex-col justify-between border-primary/20 shadow-orange h-full min-h-[110px]">
                            <card.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                            <h4 className="font-bold text-xs text-white uppercase italic mt-4">{card.title}</h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 2. LEDGERS */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em]">Financial Ledgers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {managementCards.map((card, i) => (
                        <Link href={card.href} key={i} className="group h-full">
                          <div className="card-medical p-5 flex flex-col justify-between border-white/5 shadow-cyan h-full min-h-[110px]">
                            <card.icon className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
                            <h4 className="font-bold text-xs text-white uppercase italic mt-4">{card.title}</h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 3. EXPENSE REPORT MODULE (DEDICATED) */}
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-[0.4em]">Expense Reporting Hub</h3>
                      <div className="h-[1px] flex-1 mx-4 bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {expenseModule.map((card, i) => (
                        <Link href={card.href} key={i} className="group">
                          <div className={`
                            card-medical p-6 flex items-center gap-5 transition-all
                            ${card.color === 'orange' ? 'border-primary/30 shadow-orange' : 'border-white/10 shadow-cyan'}
                          `}>
                            <card.icon className={`w-8 h-8 ${card.color === 'orange' ? 'text-primary' : 'text-white/40'}`} />
                            <div>
                              <h4 className="font-black text-sm text-white uppercase italic leading-none">{card.title}</h4>
                              <p className="text-[9px] opacity-40 mt-1">{card.desc}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                </div> {/* End lg:col-span-3 */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

