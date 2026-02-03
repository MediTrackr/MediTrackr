"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CheckCircle, AlertTriangle, ExternalLink, FileText, Lock } from "lucide-react";
import { getCategoryConfig, ALL_CATEGORIES, ProfessionalCategory, RAMQForm, getAggregatedForms } from "@/utils/ramq-categories";

function FormCard({ form, profileData }: { form: RAMQForm; profileData: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border transition-all ${form.required ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
      <div className="p-5 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${form.required ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}>
          {form.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className={`text-sm font-bold ${form.required ? 'text-primary' : 'text-white'}`}>{form.title}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono mt-0.5">{form.system}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {form.required ? (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">Requis</span>
              ) : (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10 uppercase tracking-wider">Optionnel</span>
              )}
            </div>
          </div>
          <p className="text-xs text-white/50 mt-2">{form.purpose}</p>

          <div className="flex gap-2 mt-3 flex-wrap">
            {form.file ? (
              <a href={form.file} download target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-8 text-xs px-3">
                  <Download className="w-3 h-3" /> Télécharger le formulaire
                </Button>
              </a>
            ) : (
              <span className="text-xs text-white/30 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Disponible sur ramq.gouv.qc.ca
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2"
            >
              {expanded ? 'Masquer' : 'Voir les informations à fournir'}
            </button>
          </div>

          {expanded && (
            <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/5 space-y-3">
              <p className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Informations pré-remplies depuis votre profil</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(profileData).map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    {value ? (
                      <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
                      <p className={`text-xs font-mono ${value ? 'text-white' : 'text-yellow-400'}`}>
                        {value || '— à compléter dans votre profil'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/20 mt-2">
                Ces données vous sont fournies à titre de référence. Remplissez le formulaire officiel et transmettez-le à la RAMQ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProfileData {
  professional_categories?: ProfessionalCategory[];
  prefix?: string;
  first_name?: string;
  last_name?: string;
  ramq_number?: string;
  license_number?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function RAMQAccessPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  const categories: ProfessionalCategory[] = profile?.professional_categories || [];
  const hasCategories = categories.length > 0;

  const profileData: Record<string, string> = {
    "Nom complet": profile ? `${profile.prefix || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    "Numéro RAMQ professionnel": profile?.ramq_number || '',
    "Numéro de permis": profile?.license_number || '',
    "Courriel": profile?.email || '',
    "Téléphone": profile?.phone || '',
    "Adresse": profile?.address || '',
  };

  const allForms = hasCategories ? getAggregatedForms(categories) : [];
  const requiredForms = allForms.filter(f => f.required);
  const optionalForms = allForms.filter(f => !f.required);

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4">
      <div className="w-full max-w-4xl bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        {/* Header */}
        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Accès RAMQ en ligne</h1>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {categories.map(cat => {
                  const c = getCategoryConfig(cat);
                  return c ? (
                    <span key={cat} className="text-[10px] text-white/40">{c.icon} {c.labelShort}</span>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-xs text-white/40 mt-1">Formulaires d&apos;accès aux services B2B de la RAMQ</p>
            )}
          </div>
          <Link href="/settings">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Paramètres
            </Button>
          </Link>
        </div>

        <div className="relative z-10 mx-6 mb-6 space-y-4">

          {loading && (
            <div className="p-8 text-center text-white/40">Chargement...</div>
          )}

          {/* No category warning */}
          {!loading && !hasCategories && (
            <div className="p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-400">Catégories professionnelles non définies</p>
                <p className="text-xs text-yellow-400/70 mt-1">
                  Définissez vos catégories dans votre profil pour voir les formulaires d&apos;accès RAMQ qui vous concernent.
                </p>
                <Link href="/profile" className="mt-2 inline-block text-xs text-yellow-400 underline">
                  Mettre à jour le profil →
                </Link>
              </div>
            </div>
          )}

          {/* Intro */}
          {!loading && hasCategories && (
            <>
              <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Comment ça fonctionne</p>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Les services en ligne B2B de la RAMQ permettent de vérifier l&apos;admissibilité des patients et de gérer leur inscription à l&apos;assurance maladie. Chaque accès nécessite un formulaire de demande distinct, transmis à la RAMQ par voie postale ou par télécopieur.
                </p>
                <p className="text-xs text-white/30">
                  Une fois approuvé, vous recevrez des identifiants de production pour configurer votre logiciel (Meditrackr) avec les services B2B.
                </p>
              </div>

              {/* Required forms */}
              {requiredForms.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Formulaires requis</h2>
                  </div>
                  {requiredForms.map(form => (
                    <FormCard key={form.number} form={form} profileData={profileData} />
                  ))}
                </div>
              )}

              {/* Optional forms */}
              {optionalForms.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 mt-4">
                    <FileText className="w-4 h-4 text-white/40" />
                    <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Formulaires optionnels / contextuels</h2>
                  </div>
                  {optionalForms.map(form => (
                    <FormCard key={form.number} form={form} profileData={profileData} />
                  ))}
                </div>
              )}

              {/* Developer note */}
              <div className="p-5 bg-white/3 border border-white/5 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-white/20 tracking-widest mb-2">Note — Développeur logiciel</p>
                <p className="text-xs text-white/30 leading-relaxed">
                  Le formulaire <strong className="text-white/50">3991</strong> (Inscription à la facturation informatisée) est destiné aux développeurs de logiciels de facturation, pas aux professionnels de la santé. Meditrackr en tant que produit logiciel doit être enregistré séparément auprès de la RAMQ.
                </p>
              </div>

              {/* All-categories overview */}
              <div className="p-5 bg-black/40 border border-white/10 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Aperçu par catégorie — Formulaires B2B</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-white/50">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 pr-4 text-[9px] uppercase tracking-wider text-white/30">Catégorie</th>
                        <th className="text-center py-2 px-2 text-[9px] uppercase tracking-wider text-white/30">4058</th>
                        <th className="text-center py-2 px-2 text-[9px] uppercase tracking-wider text-white/30">4123</th>
                        <th className="text-center py-2 px-2 text-[9px] uppercase tracking-wider text-white/30">4134</th>
                        <th className="text-center py-2 px-2 text-[9px] uppercase tracking-wider text-white/30">4444</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_CATEGORIES.map(([key, c]) => {
                        const nums = c.b2bForms.map(f => f.number);
                        const isCurrent = categories.includes(key);
                        return (
                          <tr key={key} className={`border-b border-white/5 ${isCurrent ? 'bg-primary/5' : ''}`}>
                            <td className={`py-2 pr-4 ${isCurrent ? 'text-primary font-bold' : ''}`}>
                              {c.icon} {c.labelShort}
                            </td>
                            {['4058','4123','4134','4444'].map(n => (
                              <td key={n} className="text-center py-2 px-2">
                                {nums.includes(n) ? (
                                  <CheckCircle className="w-3 h-3 text-green-400 inline" />
                                ) : (
                                  <span className="text-white/10">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
