"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const CATEGORIES = [
  "Fournitures de bureau", "Équipement", "Fournitures médicales", "Assurance",
  "Services publics", "Salaires", "Loyer", "Marketing", "Déplacements", "Autre",
];

export default function NewBudgetPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    budget_name:    "",
    category:       "Fournitures de bureau",
    planned_amount: "",
    period_start:   "",
    period_end:     "",
    notes:          "",
  });

  const set = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      if (new Date(formData.period_end) <= new Date(formData.period_start)) {
        alert("La date de fin doit être postérieure à la date de début.");
        setLoading(false);
        return;
      }

      const planned = parseFloat(formData.planned_amount) || 0;
      if (planned <= 0) {
        alert("Le montant planifié doit être supérieur à 0.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("budgets").insert({
        user_id:        user.id,
        budget_name:    formData.budget_name,
        category:       formData.category,
        planned_amount: planned,
        period_start:   formData.period_start,
        period_end:     formData.period_end,
        notes:          formData.notes || null,
        actual_amount:  0,
      });
      if (error) throw error;

      router.push("/dashboard/budget");
    } catch (err) {
      console.error(err);
      alert("Échec de la création du budget. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-3xl bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Nouveau budget</h1>
          <Link href="/dashboard/budget">
            <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            <div className="card-medical p-6 border-l-4 border-primary">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Détails du budget</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Nom du budget *</label>
                  <input required type="text"
                    value={formData.budget_name}
                    onChange={e => set("budget_name", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="ex. Budget opérationnel T2 2026" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Catégorie</label>
                  <select value={formData.category} onChange={e => set("category", e.target.value)}
                    className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Montant planifié ($) *</label>
                  <input required type="number" step="0.01" min="0.01"
                    value={formData.planned_amount}
                    onChange={e => set("planned_amount", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                    placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Date de début *</label>
                  <input required type="date"
                    value={formData.period_start}
                    onChange={e => set("period_start", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Date de fin *</label>
                  <input required type="date"
                    value={formData.period_end}
                    onChange={e => set("period_end", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
              </div>
            </div>

            <div className="card-medical p-6">
              <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Notes</h2>
              <textarea
                value={formData.notes}
                onChange={e => set("notes", e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[80px]"
                placeholder="Objectifs ou notes du budget…" />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}
                className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-cyan">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Créer le budget
              </Button>
              <Link href="/dashboard/budget" className="flex-1">
                <Button variant="outline" type="button" className="w-full h-14 rounded-2xl border-white/20">Annuler</Button>
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
