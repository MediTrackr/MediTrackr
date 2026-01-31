"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from "lucide-react";

export default function ViewBudgetsPage() {
  const supabase = createClient();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  async function fetchBudgets() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .order('period_start', { ascending: false });
        
        if (data) setBudgets(data);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  }

  const getPercentage = (actual: number, planned: number) => {
    if (!planned) return 0;
    return (actual / planned) * 100;
  };

  const isOverBudget = (actual: number, planned: number) => {
    return actual > planned;
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
        
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-orange-400"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-orange-400"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-orange-400 uppercase italic tracking-tighter">
            View Budgets
          </h1>
          <div className="flex gap-3">
            <Link href="/budgets/new">
              <Button className="gap-2 bg-orange-500 text-black rounded-xl px-4 h-10 font-bold">
                <Plus className="w-4 h-4" /> New Budget
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
              <div className="text-center text-white/40 py-12">Loading budgets...</div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">No budgets created</p>
                <Link href="/budgets/new">
                  <Button className="bg-orange-500 text-black">Create Your First Budget</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const percentage = getPercentage(budget.actual_amount || 0, budget.planned_amount);
                  const overBudget = isOverBudget(budget.actual_amount || 0, budget.planned_amount);
                  
                  return (
                    <div key={budget.id} className="card-medical p-6 border-l-4 border-orange-400 hover:border-orange-400/60 transition-all">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{budget.budget_name}</h3>
                            <p className="text-xs text-white/40">
                              {budget.period_start} to {budget.period_end} • {budget.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/40 mb-1">Actual / Planned</p>
                            <p className={`text-2xl font-bold ${overBudget ? 'text-red-400' : 'text-green-400'}`}>
                              ${budget.actual_amount?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-white/60">/ ${budget.planned_amount?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Progress</span>
                            <span className={`font-bold ${overBudget ? 'text-red-400' : 'text-green-400'}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${overBudget ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          {overBudget ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-red-400" />
                              <span className="text-xs text-red-400 font-medium">Over Budget</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-green-400 font-medium">On Track</span>
                            </>
                          )}
                        </div>

                        {budget.notes && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-xs text-white/40">{budget.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}