"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Send, FileText, Globe, Flag, Shield,
  CheckSquare, Square, ChevronDown, ChevronUp, Loader2, AlertCircle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClaimType = "ramq" | "federal" | "out_of_province" | "diplomatic";

interface BaseClaim {
  id: string;
  type: ClaimType;
  patient_name: string;
  service_date: string;
  total_claimed: number;
  status: string;
  created_at: string;
  diagnostic_code?: string | null;
  notes?: string | null;
}

interface RamqClaim extends BaseClaim {
  type: "ramq";
  patient_ramq: string;
  doctor_ramq?: string | null;
  act_codes?: unknown;
  location_code?: string | null;
  professional_category?: string | null;
}

interface FederalClaim extends BaseClaim {
  type: "federal";
  patient_federal_id?: string | null;
  unit_or_facility?: string | null;
}

interface OutProvinceClaim extends BaseClaim {
  type: "out_of_province";
  patient_health_number: string;
  patient_province: string;
  province_code: string;
}

interface DiplomaticClaim extends BaseClaim {
  type: "diplomatic";
  patient_code: string;
  country_code: string;
  embassy_or_consulate: string;
}

type AnyDraftClaim = RamqClaim | FederalClaim | OutProvinceClaim | DiplomaticClaim;

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  fr: {
    title: "Lot du jour",
    subtitle: "Réclamations en attente de soumission",
    empty: "Aucune réclamation en attente aujourd'hui.",
    emptyHint: "Les nouvelles réclamations créées en mode brouillon apparaîtront ici.",
    selectAll: "Tout sélectionner",
    deselectAll: "Tout désélectionner",
    submitBatch: "Soumettre le lot",
    submitting: "Soumission en cours…",
    totalSelected: (n: number, amt: string) => `${n} réclamation${n > 1 ? "s" : ""} · ${amt}`,
    batchName: "Nom du lot (optionnel)",
    batchNamePlaceholder: `Lot du ${new Date().toLocaleDateString('fr-CA')}`,
    success: "Lot soumis avec succès !",
    errorFetch: "Erreur lors du chargement des réclamations.",
    errorSubmit: "Erreur lors de la soumission. Veuillez réessayer.",
    noneSelected: "Sélectionnez au moins une réclamation.",
    sections: {
      ramq: "RAMQ",
      federal: "Fédéral / SSNA",
      out_of_province: "Hors province",
      diplomatic: "Diplomatique",
    },
    fields: {
      diagnostic: "Code diagnostic",
      notes: "Notes",
      patient: "Patient",
      date: "Date de service",
      amount: "Montant",
    },
  },
  en: {
    title: "Today's Batch",
    subtitle: "Claims pending submission",
    empty: "No pending claims today.",
    emptyHint: "New claims created as drafts will appear here.",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    submitBatch: "Submit batch",
    submitting: "Submitting…",
    totalSelected: (n: number, amt: string) => `${n} claim${n > 1 ? "s" : ""} · ${amt}`,
    batchName: "Batch name (optional)",
    batchNamePlaceholder: `Batch ${new Date().toLocaleDateString()}`,
    success: "Batch submitted successfully!",
    errorFetch: "Error loading claims.",
    errorSubmit: "Submission failed. Please try again.",
    noneSelected: "Select at least one claim.",
    sections: {
      ramq: "RAMQ",
      federal: "Federal / NIHB",
      out_of_province: "Out-of-province",
      diplomatic: "Diplomatic",
    },
    fields: {
      diagnostic: "Diagnostic code",
      notes: "Notes",
      patient: "Patient",
      date: "Service date",
      amount: "Amount",
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<ClaimType, React.ReactNode> = {
  ramq:            <FileText className="w-4 h-4 text-primary" />,
  federal:         <Flag className="w-4 h-4 text-blue-400" />,
  out_of_province: <Globe className="w-4 h-4 text-yellow-400" />,
  diplomatic:      <Shield className="w-4 h-4 text-purple-400" />,
};

const SECTION_COLORS: Record<ClaimType, string> = {
  ramq:            "border-primary/30 bg-primary/5",
  federal:         "border-blue-400/30 bg-blue-500/5",
  out_of_province: "border-yellow-400/30 bg-yellow-500/5",
  diplomatic:      "border-purple-400/30 bg-purple-500/5",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

const getTableNameByType = (type: ClaimType) => {
  const tableMap: Record<ClaimType, string> = {
    ramq: "ramq_claims",
    federal: "federal_claims",
    out_of_province: "out_of_province_claims",
    diplomatic: "diplomatic_claims",
  };
  return tableMap[type];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BatchPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [lang, setLang]         = useLang();
  const [claims, setClaims]     = useState<AnyDraftClaim[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits]       = useState<Record<string, Partial<BaseClaim>>>({});
  const [collapsed, setCollapsed] = useState<Set<ClaimType>>(new Set());
  const [batchName, setBatchName] = useState("");
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const t = T[lang];

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [ramq, federal, outProv, diplo] = await Promise.all([
        supabase.from("ramq_claims").select("*").eq("user_id", user.id).eq("status", "draft"),
        supabase.from("federal_claims").select("*").eq("user_id", user.id).eq("status", "draft"),
        supabase.from("out_of_province_claims").select("*").eq("user_id", user.id).eq("status", "draft"),
        supabase.from("diplomatic_claims").select("*").eq("user_id", user.id).eq("status", "draft"),
      ]);

      const all: AnyDraftClaim[] = [
        ...(ramq.data    || []).map(c => ({ ...c, type: "ramq" as const })),
        ...(federal.data || []).map(c => ({ ...c, type: "federal" as const })),
        ...(outProv.data || []).map(c => ({ ...c, type: "out_of_province" as const })),
        ...(diplo.data   || []).map(c => ({ ...c, type: "diplomatic" as const, patient_name: c.patient_code })),
      ];

      setClaims(all);
      setSelected(new Set(all.map(c => c.id)));
    } catch (e) {
      setError(t.errorFetch);
    } finally {
      setLoading(false);
    }
  }, [supabase, router, t.errorFetch]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSection = (type: ClaimType) => {
    const ids = claims.filter(c => c.type === type).map(c => c.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(claims.map(c => c.id)));
  const deselectAll = () => setSelected(new Set());

  const setEdit = (id: string, field: keyof BaseClaim, value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");

      const now = new Date().toISOString();
      
      const { data: batch, error: batchError } = await supabase
        .from("billing_batches")
        .insert({
          status: "pending",
          claim_count: selected.size,
          created_by: user.id,
          batch_name: batchName || `Batch ${new Date().toLocaleDateString()}`
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const selectedClaimsList = claims.filter(c => selected.has(c.id));

      const updates = selectedClaimsList.map((claim) => {
        const edit = edits[claim.id] || {};
        const tableName = getTableNameByType(claim.type);

        const updatePayload: any = {
          status: "submitted",
          submitted_at: now,
          batch_id: batch.id,
          notes: edit.notes ?? claim.notes,
        };

        if (claim.type === "ramq") {
          updatePayload.diagnostic_code = edit.diagnostic_code ?? (claim as RamqClaim).diagnostic_code;
        }

        return supabase.from(tableName).update(updatePayload).eq("id", claim.id);
      });

      const results = await Promise.all(updates);
      const firstError = results.find(res => res.error);
      if (firstError) throw firstError.error;

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
      
    } catch (err) {
      console.error(err);
      setError(t.errorSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTotal = claims.filter(c => selected.has(c.id)).reduce((sum, c) => sum + c.total_claimed, 0);
  const grouped = claims.reduce<Record<ClaimType, AnyDraftClaim[]>>(
    (acc, c) => { acc[c.type].push(c); return acc; },
    { ramq: [], federal: [], out_of_province: [], diplomatic: [] }
  );

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <p className="text-primary text-xl font-bold italic uppercase tracking-tighter">{t.success}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-5xl min-h-[90vh] bg-[#050505] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Glass Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-white/5">
                <ArrowLeft className="w-5 h-5 text-white/50" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-primary italic uppercase tracking-tighter">{t.title}</h1>
              <p className="text-white/30 text-[10px] uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLang(lang === "fr" ? "en" : "fr")} className="border-white/10 text-white/50 text-[10px]">
            {lang.toUpperCase()}
          </Button>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] text-white/40 hover:text-white"><CheckSquare className="w-3 h-3 mr-1" /> {t.selectAll}</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-[10px] text-white/40 hover:text-white"><Square className="w-3 h-3 mr-1" /> {t.deselectAll}</Button>
              </div>

              {(Object.keys(grouped) as ClaimType[]).map(type => {
                const group = grouped[type];
                if (group.length === 0) return null;
                return (
                  <div key={type} className={`rounded-2xl border ${SECTION_COLORS[type]} overflow-hidden`}>
                    <div className="p-4 flex justify-between items-center bg-white/[0.02]">
                      <div className="flex items-center gap-2 font-bold text-sm text-white/80">
                        {SECTION_ICONS[type]} {t.sections[type]} ({group.length})
                      </div>
                      <span className="text-xs text-white/40">{fmt(group.reduce((s, c) => s + c.total_claimed, 0))}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {group.map(claim => (
                        <div key={claim.id} className={`p-4 flex gap-4 transition-all ${selected.has(claim.id) ? "bg-white/[0.03]" : "opacity-40"}`}>
                          <button onClick={() => toggle(claim.id)} className="text-primary">
                            {selected.has(claim.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-white/10" />}
                          </button>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-bold text-white">{claim.patient_name}</p>
                              <p className="text-[10px] text-white/30">{fmtDate(claim.service_date)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <input 
                                 className="bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] w-full focus:border-primary/50 outline-none"
                                 placeholder="Notes..."
                                 value={edits[claim.id]?.notes ?? claim.notes ?? ""}
                                 onChange={(e) => setEdit(claim.id, "notes", e.target.value)}
                               />
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-white/90">{fmt(claim.total_claimed)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Submit */}
        {!loading && claims.length > 0 && (
          <div className="p-6 bg-black border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <input 
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm w-full md:w-64 outline-none focus:border-primary/40"
              placeholder={t.batchNamePlaceholder}
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">{lang === "fr" ? "Total sélectionné" : "Total selected"}</p>
                <p className="text-lg font-black text-primary">{fmt(selectedTotal)}</p>
              </div>
              <Button 
                disabled={submitting || selected.size === 0}
                onClick={handleSubmit}
                className="bg-primary hover:bg-primary/80 text-black font-black px-8 py-6 rounded-xl"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> {t.submitBatch}</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}