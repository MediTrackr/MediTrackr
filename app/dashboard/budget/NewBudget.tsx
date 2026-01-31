"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, PieChart } from "lucide-react";

export default function NewBudgetPage() {
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
            New Budget
          </h1>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">
            
            <div className="card-medical p-6 border-l-4 border-orange-400">
              <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4">
                Budget Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Budget Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="e.g., Q1 2025 Operating Budget"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Category</label>
                  <select className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                    <option>Office Supplies</option>
                    <option>Equipment</option>
                    <option>Marketing</option>
                    <option>Insurance</option>
                    <option>Utilities</option>
                    <option>Salaries</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Planned Amount</label>
                  <input 
                    type="number" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Period Start</label>
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Period End</label>
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="card-medical p-6">
              <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
                Notes
              </h2>
              <textarea 
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[100px]"
                placeholder="Budget notes or goals..."
              />
            </div>

            <div className="flex gap-4">
              <Button className="flex-1 bg-orange-500 text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-orange">
                <Save className="w-5 h-5 mr-2" /> Create Budget
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