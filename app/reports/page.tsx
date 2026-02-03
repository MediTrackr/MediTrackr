"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, Loader2 } from "lucide-react";

export default function Reports() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBilled: 0, totalReceived: 0, totalExpenses: 0,
    monthlyData: [] as { month: string; billed: number; received: number; expenses: number }[],
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [claimsRes, expensesRes] = await Promise.all([
        supabase.from('ramq_claims').select('total_claimed, amount_received, service_date')
          .eq('user_id', user.id),
        supabase.from('expenses').select('amount, expense_date')
          .eq('user_id', user.id),
      ]);

      const claims = claimsRes.data || [];
      const expenses = expensesRes.data || [];

      const totalBilled = claims.reduce((s, c) => s + (c.total_claimed || 0), 0);
      const totalReceived = claims.reduce((s, c) => s + (c.amount_received || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

      // Build last 6 months
      const months: Record<string, { billed: number; received: number; expenses: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        months[key] = { billed: 0, received: 0, expenses: 0 };
      }

      claims.forEach(c => {
        const key = c.service_date?.slice(0, 7);
        if (key && months[key]) {
          months[key].billed += c.total_claimed || 0;
          months[key].received += c.amount_received || 0;
        }
      });

      expenses.forEach(e => {
        const key = e.expense_date?.slice(0, 7);
        if (key && months[key]) {
          months[key].expenses += e.amount || 0;
        }
      });

      const monthlyData = Object.entries(months).map(([month, vals]) => ({ month, ...vals }));

      setStats({ totalBilled, totalReceived, totalExpenses, monthlyData });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const netIncome = stats.totalReceived - stats.totalExpenses;
  const margin = stats.totalReceived > 0 ? (netIncome / stats.totalReceived) * 100 : 0;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-primary text-glow">Financial Reports</h1>
          <Button glow className="gap-2">
            <Download className="w-5 h-5" />
            Export Report
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="stat-card rounded-lg border border-primary-500/10 bg-secondary-900/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-medical-teal" />
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <p className="text-lg font-semibold">Net Income</p>
                </div>
                <p className={`text-4xl font-bold mb-2 ${netIncome >= 0 ? 'text-success' : 'text-accent'}`}>
                  ${netIncome.toFixed(2)}
                </p>
                <p className="text-sm text-foreground/70">
                  Revenue: ${stats.totalReceived.toFixed(2)} | Expenses: ${stats.totalExpenses.toFixed(2)}
                </p>
              </div>

              <div className="stat-card rounded-lg border border-primary-500/10 bg-secondary-900/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-medical-cyan" />
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  <p className="text-lg font-semibold">Profit Margin</p>
                </div>
                <p className="text-4xl font-bold text-white mb-2">{margin.toFixed(1)}%</p>
                <p className="text-sm text-foreground/70">Total billed: ${stats.totalBilled.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-primary-500/10 bg-secondary-900/50 overflow-hidden">
              <div className="p-6 border-b border-primary-500/10">
                <h2 className="text-xl font-semibold">Monthly Comparison (Last 6 Months)</h2>
              </div>
              <div className="p-6 space-y-3">
                {stats.monthlyData.length === 0 ? (
                  <p className="text-center text-foreground/60 py-4">No data yet.</p>
                ) : (
                  stats.monthlyData.slice().reverse().map(({ month, billed, received, expenses }) => {
                    const net = received - expenses;
                    return (
                      <div key={month} className="flex items-center justify-between p-4 bg-secondary-900/50 rounded-lg border border-primary-500/10">
                        <span className="font-medium w-28">{month}</span>
                        <div className="flex gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-foreground/40">Billed</p>
                            <p className="font-semibold text-primary">${billed.toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-foreground/40">Received</p>
                            <p className="font-semibold text-success">${received.toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-foreground/40">Expenses</p>
                            <p className="font-semibold text-accent">${expenses.toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-foreground/40">Net</p>
                            <p className={`font-semibold ${net >= 0 ? 'text-success' : 'text-accent'}`}>${net.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
