"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import SmartScanner, { SmartScanExpenseData } from "@/components/SmartScanner";

const CATEGORIES = [
  "Fournitures de bureau", "Équipement", "Fournitures médicales", "Assurance",
  "Services publics", "Salaires", "Loyer", "Marketing", "Déplacements", "Autre",
];

function localToday(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function sanitizeAmount(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
}

type ExpenseRow = { description: string; category: string; expense_date: string; amount: string; vendor: string };

export default function UploadExpensePage() {
  const supabase     = createClient();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState<"scan" | "manual" | "csv">(
    searchParams.get("from") === "scan" ? "scan" : "manual"
  );

  // Read expense data injected by the standalone scanner
  useEffect(() => {
    const raw = sessionStorage.getItem("smartscan_expense");
    if (!raw) return;
    try {
      const data: SmartScanExpenseData = JSON.parse(raw);
      sessionStorage.removeItem("smartscan_expense");
      setRows([{
        description:  data.description || "",
        category:     "Autre",
        expense_date: data.date || localToday(),
        amount:       String(data.amount || ""),
        vendor:       data.vendor || "",
      }]);
      setMode("manual");
    } catch { /* ignore */ }
  }, []);
  const [rows, setRows]       = useState<ExpenseRow[]>([
    { description: "", category: "Fournitures de bureau", expense_date: localToday(), amount: "", vendor: "" },
  ]);

  const addRow = () =>
    setRows(r => [...r, { description: "", category: "Fournitures de bureau", expense_date: localToday(), amount: "", vendor: "" }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: string) =>
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  function switchMode(next: "manual" | "csv") {
    if (rows.length > 1 || rows[0].description) {
      if (!confirm("Changer de mode effacera les lignes actuelles. Continuer ?")) return;
    }
    setRows([{ description: "", category: "Fournitures de bureau", expense_date: localToday(), amount: "", vendor: "" }]);
    setMode(next);
  }

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const parsed = lines.slice(1).map(line => {
        const cols = parseCSVLine(line);
        return {
          expense_date: cols[0] || localToday(),
          description:  cols[1] || "",
          vendor:       cols[2] || "",
          category:     cols[3] || "Autre",
          amount:       cols[4] || "0",
        };
      }).filter(r => r.description);
      if (parsed.length) setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = rows.filter(r => r.description && sanitizeAmount(r.amount) > 0);
    if (!valid.length) { alert("Veuillez ajouter au moins une dépense avec un montant valide."); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const records = valid.map(r => ({
        user_id:      user.id,
        description:  r.description,
        category:     r.category,
        expense_date: r.expense_date,
        amount:       sanitizeAmount(r.amount),
        vendor:       r.vendor || null,
      }));

      const { error } = await supabase.from("expenses").insert(records);
      if (error) throw error;
      router.push("/dashboard/expenses/report");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement.";
      alert(`Erreur : ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Importer des dépenses</h1>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            {/* Mode toggle */}
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setMode("scan")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  mode === "scan" ? "bg-primary text-black border-primary" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}>
                📷 Scanner un reçu
              </button>
              <button type="button" onClick={() => switchMode("manual")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  mode === "manual" ? "bg-primary text-black border-primary" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}>
                Saisie manuelle
              </button>
              <button type="button" onClick={() => switchMode("csv")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  mode === "csv" ? "bg-primary text-black border-primary" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}>
                <Upload className="w-3 h-3" /> Importer CSV
              </button>
            </div>

            {mode === "scan" && (
              <SmartScanner
                onExpenseData={(data) => {
                  setRows([{
                    description:  data.description || "",
                    category:     "Autre",
                    expense_date: data.date || localToday(),
                    amount:       String(data.amount || ""),
                    vendor:       data.vendor || "",
                  }]);
                  setMode("manual");
                }}
              />
            )}

            {mode === "csv" && (
              <div className="card-medical p-6 border-l-4 border-primary space-y-3">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Format CSV</h2>
                <p className="text-xs text-white/40">Colonnes attendues : Date, Description, Fournisseur, Catégorie, Montant</p>
                <p className="text-[10px] text-white/30">Les champs contenant des virgules doivent être entourés de guillemets.</p>
                <input type="file" accept=".csv" onChange={handleCSV}
                  className="text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-primary/30 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              </div>
            )}

            <div className="card-medical p-6 border-l-4 border-primary">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Lignes de dépenses</h2>
                <Button type="button" onClick={addRow} size="sm"
                  className="gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Description *</label>
                      <input type="text" value={row.description} onChange={e => updateRow(i, "description", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="ex. Papier imprimante" />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Fournisseur</label>
                      <input type="text" value={row.vendor} onChange={e => updateRow(i, "vendor", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="Nom du fournisseur" />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Catégorie</label>
                      <select value={row.category} onChange={e => updateRow(i, "category", e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 rounded-lg text-sm text-white">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Date</label>
                      <input type="date" value={row.expense_date} onChange={e => updateRow(i, "expense_date", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" />
                    </div>
                    <div className="col-span-5 md:col-span-2 space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Montant ($) *</label>
                      <input type="number" step="0.01" min="0" value={row.amount}
                        onChange={e => updateRow(i, "amount", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                        placeholder="0.00" />
                    </div>
                    <div className="col-span-1">
                      {rows.length > 1 && (
                        <Button type="button" onClick={() => removeRow(i)} size="sm" variant="ghost"
                          className="w-full text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ${rows.reduce((s, r) => s + (sanitizeAmount(r.amount)), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}
                className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-cyan">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Enregistrer les dépenses
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" type="button" className="w-full h-14 rounded-2xl border-white/20">Annuler</Button>
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
