"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { User, Building2, CreditCard, Save, ArrowRight, CheckCircle, Plus, Trash2, MapPin } from "lucide-react";
import { ALL_CATEGORIES, ProfessionalCategory, REMUNERATION_MODES, RemunerationMode } from "@/utils/ramq-categories";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVINCES = [
  { code: "QC", label: "Québec" },
  { code: "ON", label: "Ontario" },
  { code: "BC", label: "Colombie-Britannique" },
  { code: "AB", label: "Alberta" },
  { code: "MB", label: "Manitoba" },
  { code: "SK", label: "Saskatchewan" },
  { code: "NS", label: "Nouvelle-Écosse" },
  { code: "NB", label: "Nouveau-Brunswick" },
  { code: "NL", label: "Terre-Neuve-et-Labrador" },
  { code: "PE", label: "Île-du-Prince-Édouard" },
  { code: "NT", label: "Territoires du Nord-Ouest" },
  { code: "NU", label: "Nunavut" },
  { code: "YT", label: "Yukon" },
];

const QC_PUBLIC_INSTITUTIONS = [
  "CHUM — Centre hospitalier de l'Université de Montréal",
  "CUSM — Centre universitaire de santé McGill",
  "CHU Sainte-Justine",
  "IUCPQ — Institut univ. de cardiologie et de pneumologie de Québec",
  "CHU de Québec — Université Laval",
  "CIUSSS du Centre-Sud-de-l'Île-de-Montréal",
  "CIUSSS de l'Est-de-l'Île-de-Montréal",
  "CIUSSS de l'Ouest-de-l'Île-de-Montréal",
  "CIUSSS du Nord-de-l'Île-de-Montréal",
  "CISSS de Laval",
  "CISSS de la Montérégie-Est",
  "CISSS de la Montérégie-Ouest",
  "CISSS de la Montérégie-Centre",
  "CISSS des Laurentides",
  "CISSS de Lanaudière",
  "CISSS de l'Outaouais",
  "CISSS de Chaudière-Appalaches",
  "CISSS du Bas-Saint-Laurent",
  "CISSS de la Côte-Nord",
  "CISSS de la Gaspésie",
  "CIUSSS du Saguenay–Lac-Saint-Jean",
  "CIUSSS de la Mauricie-et-du-Centre-du-Québec",
  "Hôpital Maisonneuve-Rosemont",
  "Hôpital du Sacré-Cœur de Montréal",
  "Hôpital Jean-Talon",
  "Hôpital Santa Cabrini",
  "Hôpital Général Juif — Jewish General Hospital",
  "Hôpital de Verdun",
  "Hôpital LaSalle",
  "Hôpital Lakeshore",
  "Hôpital du Haut-Richelieu",
  "Hôpital Charles-Le Moyne",
  "Hôpital Pierre-Boucher",
  "Hôpital Anna-Laberge",
  "Centre hospitalier de St. Mary",
  "Institut de cardiologie de Montréal",
  "Institut Philippe-Pinel de Montréal",
  "Institut univ. en santé mentale de Montréal",
  "Institut univ. en santé mentale Douglas",
  "Centre gériatrique Maimonides",
  "Autre établissement public",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface PlaceOfWork {
  id: string;
  type: "public" | "prive";
  publicName: string;
  privateName: string;
  address: Address;
}

const emptyAddress = (): Address => ({ street: "", city: "", province: "QC", postalCode: "" });
const emptyPlace = (): PlaceOfWork => ({
  id: crypto.randomUUID(),
  type: "public",
  publicName: "",
  privateName: "",
  address: emptyAddress(),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls = "w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40";
const labelCls = "text-xs uppercase font-bold text-white/40";

function AddressFields({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const set = (key: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-1">
        <label className={labelCls}>Rue / numéro civique</label>
        <input type="text" value={value.street} onChange={set("street")} className={inputCls} placeholder="123, rue Principale" />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Ville</label>
        <input type="text" value={value.city} onChange={set("city")} className={inputCls} placeholder="Montréal" />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Code postal</label>
        <input type="text" value={value.postalCode} onChange={set("postalCode")} className={inputCls} placeholder="H1A 1A1" maxLength={7} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <label className={labelCls}>Province / Territoire</label>
        <select value={value.province} onChange={set("province")} className={inputCls}>
          {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const STEP_LABELS = [
  "Informations personnelles",
  "Catégories professionnelles",
  "Lieux de pratique",
  "Mode de facturation",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("practice_settings")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) { router.replace("/dashboard"); return; }
      setLoading(false);
    })();
  }, []);

  // Step 1
  const [personal, setPersonal] = useState({
    prefix: "Dr.",
    firstName: "",
    lastName: "",
    ramq_number: "",
    licenseNumber: "",
    specialty: "",
    phone: "",
    email: "",
    address: emptyAddress(),
  });

  // Step 2
  const [selectedCategories, setSelectedCategories] = useState<ProfessionalCategory[]>([]);

  // Step 3
  const [taxNumber, setTaxNumber] = useState("");
  const [places, setPlaces] = useState<PlaceOfWork[]>([emptyPlace()]);

  // Step 4
  const [selectedModes, setSelectedModes] = useState<RemunerationMode[]>([]);
  const [banking, setBanking] = useState({ bankName: "", institutionNumber: "", transitNumber: "", accountNumber: "" });

  const toggleCategory = (cat: ProfessionalCategory) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const toggleMode = (mode: RemunerationMode) =>
    setSelectedModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]);

  const updatePlace = (id: string, update: Partial<PlaceOfWork>) =>
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));

  const updatePlaceAddress = (id: string, address: Address) =>
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, address } : p));

  const canAdvance = () => {
    if (step === 1) return personal.firstName.trim() && personal.lastName.trim();
    if (step === 2) return selectedCategories.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Non authentifié"); return; }

      const addressStr = [personal.address.street, personal.address.city, personal.address.province, personal.address.postalCode].filter(Boolean).join(", ");

      await supabase.from('profiles').upsert({
        id: user.id,
        professional_categories: selectedCategories,
        remuneration_modes: selectedModes,
        prefix: personal.prefix,
        first_name: personal.firstName,
        last_name: personal.lastName,
        ramq_number: personal.ramq_number,
        license_number: personal.licenseNumber,
        specialty: personal.specialty,
        phone: personal.phone,
        email: personal.email,
        address: addressStr,
        updated_at: new Date().toISOString(),
      });

      const firstPlace = places[0];
      const practiceName = firstPlace?.type === "public" ? firstPlace.publicName : firstPlace?.privateName;
      const practiceAddressStr = firstPlace ? [firstPlace.address.street, firstPlace.address.city, firstPlace.address.province, firstPlace.address.postalCode].filter(Boolean).join(", ") : "";

      await supabase.from('practice_settings').upsert({
        user_id: user.id,
        practice_name: practiceName,
        practice_address: practiceAddressStr,
        site_appartenance: firstPlace?.type === "public" ? firstPlace.publicName : "",
        tax_number: taxNumber,
        places_of_work: JSON.stringify(places),
        bank_name: banking.bankName,
        institution_number: banking.institutionNumber,
        transit_number: banking.transitNumber,
        account_number: banking.accountNumber,
        updated_at: new Date().toISOString(),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-4xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <Image src="/images/meditrackr logo.png" alt="" width={600} height={600} className="opacity-5" />
        </div>

        {/* Header */}
        <div className="relative z-10 m-4 sm:m-6 p-4 sm:p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-center">
          <Image src="/images/meditrackr logo.png" alt="Logo" width={40} height={40} className="mx-auto mb-2" />
          <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase italic tracking-tighter mb-1">Bienvenue sur MediTrackr</h1>
          <p className="text-xs text-white/40">Étape {step} sur {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
        </div>

        {/* Progress */}
        <div className="relative z-10 mx-4 sm:mx-6 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEP_LABELS.map((label, i) => (
              <span key={i} className={`text-[9px] uppercase tracking-wider ${i + 1 === step ? 'text-primary font-bold' : 'text-white/20'}`}>
                {label.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-4 sm:mx-6 mb-4 sm:mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto p-4 sm:p-8 space-y-6">

            {/* ── STEP 1: Informations personnelles ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-primary uppercase tracking-wide">Informations personnelles</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>Titre</label>
                    <select value={personal.prefix} onChange={e => setPersonal(p => ({ ...p, prefix: e.target.value }))} className={inputCls}>
                      <option>Dr.</option><option>Dre.</option><option>M.</option><option>Mme.</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Prénom *</label>
                    <input type="text" value={personal.firstName} onChange={e => setPersonal(p => ({ ...p, firstName: e.target.value }))} className={inputCls} placeholder="Prénom" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Nom *</label>
                    <input type="text" value={personal.lastName} onChange={e => setPersonal(p => ({ ...p, lastName: e.target.value }))} className={inputCls} placeholder="Nom de famille" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Numéro RAMQ professionnel</label>
                    <input type="text" value={personal.ramq_number} onChange={e => setPersonal(p => ({ ...p, ramq_number: e.target.value }))} className={inputCls + " font-mono"} placeholder="6 chiffres" maxLength={6} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Numéro de permis / CPOM</label>
                    <input type="text" value={personal.licenseNumber} onChange={e => setPersonal(p => ({ ...p, licenseNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="CPOM #" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Spécialité</label>
                    <input type="text" value={personal.specialty} onChange={e => setPersonal(p => ({ ...p, specialty: e.target.value }))} className={inputCls} placeholder="ex. Cardiologie" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Téléphone</label>
                    <input type="tel" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="(514) 555-1234" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className={labelCls}>Courriel</label>
                    <input type="email" value={personal.email} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="votre@courriel.com" />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Adresse personnelle</p>
                  <AddressFields value={personal.address} onChange={addr => setPersonal(p => ({ ...p, address: addr }))} />
                </div>
              </div>
            )}

            {/* ── STEP 2: Catégories professionnelles ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-white/10">
                  <h2 className="text-lg font-bold text-primary uppercase tracking-wide mb-1">Catégories professionnelles *</h2>
                  <p className="text-xs text-white/40">Sélectionnez toutes les catégories qui s&apos;appliquent. Chaque catégorie détermine les codes de facturation RAMQ accessibles.</p>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-primary/60 tracking-widest">Sélectionnées :</span>
                    {selectedCategories.map(cat => {
                      const cfg = ALL_CATEGORIES.find(([k]) => k === cat)?.[1];
                      return <span key={cat} className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">{cfg?.icon} {cfg?.labelShort}</span>;
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_CATEGORIES.map(([key, cfg]) => {
                    const selected = selectedCategories.includes(key);
                    return (
                      <button key={key} type="button" onClick={() => toggleCategory(key)}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30 hover:bg-white/5'}`}>
                        <span className="text-2xl shrink-0 mt-0.5">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold leading-tight ${selected ? 'text-primary' : 'text-white'}`}>{cfg.label}</p>
                          <p className="text-[9px] text-white/30 mt-1 font-mono uppercase tracking-wider">{cfg.providerNote}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {selected && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Lieux de pratique ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <Building2 className="w-5 h-5 text-green-400" />
                  <div>
                    <h2 className="text-lg font-bold text-green-400 uppercase tracking-wide">Lieux de pratique</h2>
                    <p className="text-xs text-white/30 mt-0.5">Ajoutez tous les endroits où vous exercez — clinique privée, hôpital, CLSC, etc.</p>
                  </div>
                </div>

                {/* Tax number */}
                <div className="space-y-1">
                  <label className={labelCls}>Numéro de taxe TPS/TVQ</label>
                  <input type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} className={inputCls} placeholder="Numéro d'identification fiscale" />
                </div>

                {/* Places list */}
                <div className="space-y-4">
                  {places.map((place, idx) => (
                    <div key={place.id} className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-bold text-white/70">Lieu {idx + 1}</span>
                        </div>
                        {places.length > 1 && (
                          <button type="button" onClick={() => setPlaces(prev => prev.filter(p => p.id !== place.id))}
                            className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Public / Privé toggle */}
                      <div className="flex gap-2">
                        {(["public", "prive"] as const).map(t => (
                          <button key={t} type="button"
                            onClick={() => updatePlace(place.id, { type: t })}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                              place.type === t
                                ? t === "public" ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                : "bg-black/20 border-white/10 text-white/30 hover:border-white/30"
                            }`}>
                            {t === "public" ? "🏥 Public" : "🏢 Privé"}
                          </button>
                        ))}
                      </div>

                      {/* Name */}
                      <div className="space-y-1">
                        <label className={labelCls}>{place.type === "public" ? "Établissement public" : "Nom de la clinique privée"}</label>
                        {place.type === "public" ? (
                          <select value={place.publicName} onChange={e => updatePlace(place.id, { publicName: e.target.value })} className={inputCls}>
                            <option value="">— Sélectionner un établissement —</option>
                            {QC_PUBLIC_INSTITUTIONS.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        ) : (
                          <input type="text" value={place.privateName} onChange={e => updatePlace(place.id, { privateName: e.target.value })} className={inputCls} placeholder="Nom de la clinique ou bureau privé" />
                        )}
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Adresse du lieu</p>
                        <AddressFields value={place.address} onChange={addr => updatePlaceAddress(place.id, addr)} />
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setPlaces(prev => [...prev, emptyPlace()])}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/40 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Ajouter un lieu de pratique
                </button>
              </div>
            )}

            {/* ── STEP 4: Mode de facturation + Bancaire ── */}
            {step === 4 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-bold text-primary uppercase tracking-wide">Mode de rémunération RAMQ</h2>
                      <p className="text-xs text-white/30 mt-0.5">Sélectionnez tous les modes qui s&apos;appliquent</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.entries(REMUNERATION_MODES) as [RemunerationMode, { label: string; description: string }][]).map(([mode, info]) => {
                      const selected = selectedModes.includes(mode);
                      return (
                        <button key={mode} type="button" onClick={() => toggleMode(mode)}
                          className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30 hover:bg-white/5'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${selected ? 'bg-primary text-black' : 'bg-white/10 text-white/60'}`}>{mode}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${selected ? 'text-primary' : 'text-white'}`}>{info.label}</p>
                            <p className="text-xs text-white/40 mt-1 leading-relaxed">{info.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${selected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                            {selected && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="pb-3 border-b border-white/10">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">Coordonnées bancaires</h3>
                    <p className="text-xs text-white/30 mt-0.5">Pour les rapports de paiement et la conciliation</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>Nom de la banque</label>
                      <input type="text" value={banking.bankName} onChange={e => setBanking(b => ({ ...b, bankName: e.target.value }))} className={inputCls} placeholder="ex. Banque Royale, TD Canada Trust" />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Numéro d&apos;institution</label>
                      <input type="text" value={banking.institutionNumber} onChange={e => setBanking(b => ({ ...b, institutionNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="000" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Numéro de transit</label>
                      <input type="text" value={banking.transitNumber} onChange={e => setBanking(b => ({ ...b, transitNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="00000" maxLength={5} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>Numéro de compte</label>
                      <input type="text" value={banking.accountNumber} onChange={e => setBanking(b => ({ ...b, accountNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="Numéro de compte" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-6">
              {step > 1 && (
                <Button onClick={() => setStep(s => s - 1)} variant="outline" className="flex-1 h-12 rounded-2xl border-white/20 text-sm">
                  Retour
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                  className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-12 rounded-2xl shadow-cyan disabled:opacity-40 text-sm">
                  Suivant <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading || !personal.firstName || !personal.lastName}
                  className="flex-1 bg-green-500 text-black font-bold uppercase tracking-wider h-12 rounded-2xl disabled:opacity-50 text-sm">
                  {loading ? "Enregistrement..." : "Terminer la configuration"} <Save className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
