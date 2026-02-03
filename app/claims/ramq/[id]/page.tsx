"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { daysUntilDeadline, isPediatric } from "@/utils/ramq-adjudicator";
import { getCategoryConfig } from "@/utils/ramq-categories";

const ROLES: Record<string, string> = {
  "1": "Rôle 1 — Médecin traitant principal",
  "2": "Rôle 2 — Médecin en continuité (début par autre)",
  "3": "Rôle 3 — Médecin remplaçant en continuité",
  "4": "Rôle 4 — Médecin consultant",
  "5": "Rôle 5 — Médecin assistant",
};

function Field({ label, value, required, missing }: { label: string; value?: string | null; required?: boolean; missing?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${missing ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-black/20'}`}>
      <p className="text-[9px] uppercase font-bold tracking-widest mb-1" style={{ color: missing ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </p>
      {missing ? (
        <p className="text-sm text-red-400 font-medium">— MANQUANT —</p>
      ) : (
        <p className="text-sm text-white font-mono">{value || <span className="text-white/30 italic">non fourni</span>}</p>
      )}
    </div>
  );
}

function SectionHeader({ number, title, color = "text-primary" }: { number: string; title: string; color?: string }) {
  return (
    <div className={`flex items-center gap-3 pb-3 border-b border-white/10 mb-4`}>
      <span className={`text-xs font-black ${color} border border-current rounded px-2 py-0.5`}>{number}</span>
      <h2 className={`text-xs font-bold ${color} uppercase tracking-widest`}>{title}</h2>
    </div>
  );
}

interface RAMQActCode {
  code: string;
  fee?: number;
  quantity?: number;
  description?: string;
}

interface RAMQClaim {
  id: string;
  status?: string;
  patient_name?: string;
  patient_ramq?: string;
  patient_dob?: string;
  doctor_ramq?: string;
  location_code?: string;
  service_date?: string;
  role?: string;
  professional_category?: string;
  act_codes?: RAMQActCode[];
  start_time?: string;
  end_time?: string;
  total_claimed?: number;
  territory_premium?: string;
  age_at_service?: string | number;
  lmp_date?: string;
  diagnostic_code?: string;
  diagnostic_desc?: string;
  context_elements?: string[];
  notes?: string;
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [claim, setClaim] = useState<RAMQClaim | null>(null);
  const [locality, setLocality] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('ramq_claims')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (!data) { router.push('/claims/ramq'); return; }
      setClaim(data);

      if (data.location_code) {
        const { data: loc } = await supabase
          .from('localities')
          .select('name, tariff_territory')
          .eq('locality_code', data.location_code)
          .single();
        if (loc) setLocality(`${loc.name} (territoire ${loc.tariff_territory})`);
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/40">Chargement...</div>
    </div>
  );

  if (!claim) return null;

  const daysLeft = claim.service_date ? daysUntilDeadline(claim.service_date) : null;
  const categoryCfg = getCategoryConfig(claim.professional_category);
  const expired = daysLeft !== null && daysLeft < 0;
  const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 10;
  const pediatricWarning = claim.patient_dob && claim.service_date && isPediatric(claim.patient_dob, claim.service_date);
  const actCodes: RAMQActCode[] = claim.act_codes || [];

  const missingFields = [
    !claim.patient_ramq && "NAM du patient",
    !claim.doctor_ramq && "Numéro du médecin (RAMQ)",
    !claim.location_code && "Lieu de dispensation",
    !claim.service_date && "Date du service",
    !claim.role && "Rôle",
    actCodes.length === 0 && "Code(s) de facturation",
    !claim.diagnostic_code && "Code diagnostique (CIM-9/CIM-10)",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4">
      <div className="w-full max-w-4xl bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        {/* Header */}
        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center print:hidden">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Fiche FacturActe</h1>
            <p className="text-xs text-white/40 mt-1">
              {categoryCfg ? `${categoryCfg.icon} ${categoryCfg.label}` : 'Référence pour saisie dans FacturActe — RAMQ'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => window.print()}
              className="gap-2 bg-primary text-black rounded-xl px-4 h-10 font-bold"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Link href="/claims/ramq">
              <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-6 mb-6 space-y-4">

          {/* Deadline banner */}
          {expired && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 print:hidden">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-400">Délai dépassé — Facture NON RECEVABLE</p>
                <p className="text-xs text-red-400/70">Le délai de 90 jours depuis le {claim.service_date} est expiré. Une demande hors délai doit être déposée.</p>
              </div>
            </div>
          )}
          {urgent && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3 print:hidden">
              <Clock className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-sm text-blue-400">
                <strong>Attention :</strong> Il reste <strong>{daysLeft} jour(s)</strong> avant la limite de 90 jours. Soumettez rapidement.
              </p>
            </div>
          )}
          {pediatricWarning && (
            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl flex items-center gap-3 print:hidden">
              <AlertTriangle className="w-5 h-5 text-pink-400 shrink-0" />
              <p className="text-sm text-pink-400">
                Patient de moins de 2 ans — vérifiez la <strong>majoration pédiatrique (+50 %)</strong> à l&apos;Annexe II de l&apos;Entente.
              </p>
            </div>
          )}
          {missingFields.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl print:hidden">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">Champs manquants</p>
              <ul className="space-y-1">
                {missingFields.map(f => (
                  <li key={f} className="text-xs text-yellow-400/80 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missingFields.length === 0 && !expired && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 print:hidden">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-sm text-green-400">Tous les champs obligatoires sont présents. Facture prête pour FacturActe.</p>
            </div>
          )}

          {/* Print title */}
          <div className="hidden print:block text-center py-4 border-b border-black/20">
            <h1 className="text-2xl font-black uppercase">Fiche de Facturation RAMQ</h1>
            <p className="text-sm text-gray-500">À saisir dans FacturActe — {new Date().toLocaleDateString('fr-CA')}</p>
          </div>

          {/* SECTION 1 — Lieu de dispensation */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <SectionHeader number="Section 1" title="Lieu de dispensation" color="text-blue-400" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Code du lieu de dispensation"
                value={claim.location_code}
                required
                missing={!claim.location_code}
              />
              <Field
                label="Localité / Territoire"
                value={locality || (claim.location_code === '60000' ? 'Hors Québec' : undefined)}
              />
              <Field
                label="Prime de territoire"
                value={claim.territory_premium ? `Territoire ${claim.territory_premium}` : undefined}
              />
            </div>
          </div>

          {/* SECTION 2 — Patient */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <SectionHeader number="Section 2" title="Informations concernant le patient" color="text-green-400" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="NAM (Numéro d'assurance maladie)"
                value={claim.patient_ramq}
                required
                missing={!claim.patient_ramq}
              />
              <Field label="Nom du patient" value={claim.patient_name} required missing={!claim.patient_name} />
              <Field label="Date de naissance" value={claim.patient_dob} />
              {pediatricWarning && (
                <Field label="Âge au service" value={`${claim.age_at_service ?? '< 2'} an(s) — PÉDIATRIQUE`} />
              )}
              {claim.lmp_date && (
                <Field label="Date des dernières menstruations (LMP)" value={claim.lmp_date} />
              )}
              <Field
                label="Code diagnostique (CIM-9/CIM-10)"
                value={claim.diagnostic_code ? `${claim.diagnostic_code}${claim.diagnostic_desc ? ' — ' + claim.diagnostic_desc : ''}` : undefined}
                required
                missing={!claim.diagnostic_code}
              />
            </div>
          </div>

          {/* SECTION 3 — Médecin */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <SectionHeader number="Section 3" title="Informations concernant le médecin" color="text-primary" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Numéro du médecin (RAMQ 6 chiffres)"
                value={claim.doctor_ramq}
                required
                missing={!claim.doctor_ramq}
              />
              <Field
                label="Rôle"
                value={claim.role ? `${claim.role} — ${ROLES[claim.role] ?? 'Rôle ' + claim.role}` : undefined}
                required
                missing={!claim.role}
              />
              {(claim.context_elements?.length ?? 0) > 0 && (
                <div className="md:col-span-2">
                  <Field
                    label="Éléments de contexte généraux"
                    value={Array.isArray(claim.context_elements) ? claim.context_elements.join(', ') : claim.context_elements}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4 — Date & Heure */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <SectionHeader number="Section 4" title="Date et heure du service" color="text-blue-400" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Date du service" value={claim.service_date} required missing={!claim.service_date} />
              <Field label="Heure de début" value={claim.start_time} />
              <Field label="Heure de fin" value={claim.end_time} />
              {daysLeft !== null && !expired && (
                <div className="md:col-span-3 p-3 rounded-lg border border-white/10 bg-black/20">
                  <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Délai de facturation (90 jours)</p>
                  <p className="text-sm text-white font-mono">
                    Limite : <strong>{new Date(new Date(claim.service_date!).getTime() + 90 * 86400000).toISOString().split('T')[0]}</strong>
                    <span className={`ml-3 text-xs font-bold ${urgent ? 'text-blue-400' : 'text-green-400'}`}>
                      ({daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''})
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5 — Codes de facturation */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <SectionHeader number="Section 5" title="Lignes de facturation" color="text-accent" />
            {actCodes.length === 0 ? (
              <p className="text-sm text-red-400">— Aucun code de facturation —</p>
            ) : (
              <div className="space-y-3">
                {actCodes.map((act, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/40 mb-1">Code de facturation</p>
                      <p className="text-lg font-black text-primary font-mono">{act.code}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[9px] uppercase font-bold text-white/40 mb-1">Description</p>
                      <p className="text-sm text-white">{act.description || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/40 mb-1">Tarif × Qté</p>
                      <p className="text-sm font-bold text-green-400">
                        ${act.fee?.toFixed(2)} × {act.quantity || 1} = ${((act.fee || 0) * (act.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-end pt-3 border-t border-white/10">
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Montant total réclamé</p>
                    <p className="text-3xl font-black text-primary">${claim.total_claimed?.toFixed(2) ?? '0.00'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {claim.notes && (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <SectionHeader number="Notes" title="Notes internes" color="text-white/40" />
              <p className="text-sm text-white/60">{claim.notes}</p>
            </div>
          )}

          {/* FacturActe checklist */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 print:hidden">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Checklist FacturActe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-white/70">
              {[
                ["Ouvrir FacturActe", "services en ligne RAMQ → FacturActe → Nouvelle facture"],
                ["Section 1 — Lieu", `Saisir le code : ${claim.location_code || '???'}`],
                ["Section 2 — Patient", `NAM : ${claim.patient_ramq || '???'}`],
                ["Section 3 — Médecin", `N° RAMQ : ${claim.doctor_ramq || '???'} | Rôle : ${claim.role || '???'}`],
                ["Section 4 — Date/Heure", `${claim.service_date} ${claim.start_time ? '| Début : ' + claim.start_time : ''} ${claim.end_time ? '| Fin : ' + claim.end_time : ''}`],
                ["Section 5 — Codes", actCodes.map((a) => a.code).join(', ') || '???'],
                ["Vérifier le montant préliminaire", `Montant attendu : $${claim.total_claimed?.toFixed(2) ?? '?'}`],
                ["Copier le N° de facture RAMQ", "Revenir dans Meditrackr → mettre à jour le statut"],
              ].map(([step, detail]) => (
                <div key={step} className="flex gap-3 p-2 bg-white/5 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-primary/40 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white/80">{step}</p>
                    <p className="text-white/40">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
