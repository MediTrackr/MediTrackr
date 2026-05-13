"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { User, Building2, CreditCard, Save, ArrowRight, CheckCircle, Plus, Trash2, MapPin, ChevronDown, ChevronUp } from "lucide-react";
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

const QC_PUBLIC_INSTITUTIONS: { region: string; institutions: string[] }[] = [
  {
    region: "Montréal",
    institutions: [
      "CHUM — Centre hospitalier de l'Université de Montréal",
      "CUSM — Centre universitaire de santé McGill",
      "CHU Sainte-Justine",
      "CIUSSS du Centre-Sud-de-l'Île-de-Montréal",
      "CIUSSS de l'Est-de-l'Île-de-Montréal",
      "CIUSSS de l'Ouest-de-l'Île-de-Montréal",
      "CIUSSS du Nord-de-l'Île-de-Montréal",
      "Hôpital Maisonneuve-Rosemont",
      "Hôpital du Sacré-Cœur de Montréal",
      "Hôpital Jean-Talon",
      "Hôpital Santa Cabrini",
      "Hôpital Général Juif — Jewish General Hospital",
      "Hôpital de Verdun",
      "Hôpital LaSalle",
      "Hôpital Lakeshore",
      "Centre hospitalier de St. Mary",
      "Institut de cardiologie de Montréal",
      "Institut Philippe-Pinel de Montréal",
      "Institut univ. en santé mentale de Montréal",
      "Institut univ. en santé mentale Douglas",
      "Centre gériatrique Maimonides",
    ],
  },
  {
    region: "Laval",
    institutions: [
      "CISSS de Laval",
      "Hôpital de la Cité-de-la-Santé de Laval",
    ],
  },
  {
    region: "Montérégie",
    institutions: [
      "CISSS de la Montérégie-Est",
      "CISSS de la Montérégie-Ouest",
      "CISSS de la Montérégie-Centre",
      "Hôpital Charles-Le Moyne",
      "Hôpital du Haut-Richelieu",
      "Hôpital Pierre-Boucher",
      "Hôpital Anna-Laberge",
      "Hôpital Honoré-Mercier (Saint-Hyacinthe)",
      "Hôpital Barrie Memorial (Ormstown)",
      "Centre hospitalier de Rouville (Marieville)",
    ],
  },
  {
    region: "Laurentides",
    institutions: [
      "CISSS des Laurentides",
      "Hôpital régional de Saint-Jérôme",
      "Hôpital de Mont-Laurier",
      "Hôpital de Sainte-Agathe-des-Monts",
      "Hôpital de Saint-Eustache",
    ],
  },
  {
    region: "Lanaudière",
    institutions: [
      "CISSS de Lanaudière",
      "Centre hospitalier régional de Lanaudière (Joliette)",
      "Hôpital Le Gardeur (Repentigny)",
      "Centre hospitalier De Lanaudière",
    ],
  },
  {
    region: "Outaouais",
    institutions: [
      "CISSS de l'Outaouais",
      "Hôpital de Gatineau",
      "Hôpital de Hull",
      "Hôpital de Papineau (Buckingham)",
      "Hôpital de Maniwaki",
    ],
  },
  {
    region: "Capitale-Nationale",
    institutions: [
      "CHU de Québec — Université Laval",
      "CIUSSS de la Capitale-Nationale",
      "IUCPQ — Institut univ. de cardiologie et de pneumologie de Québec",
      "Hôpital de l'Enfant-Jésus",
      "Hôpital Saint-François d'Assise",
      "Hôpital du Saint-Sacrement",
      "Hôtel-Dieu de Québec",
      "Centre hospitalier universitaire de Laval (CHUL)",
      "Hôpital Jeffery Hale",
    ],
  },
  {
    region: "Chaudière-Appalaches",
    institutions: [
      "CISSS de Chaudière-Appalaches",
      "Hôtel-Dieu de Lévis",
      "Centre hospitalier Paul-Gilbert (Charny)",
      "Hôpital de Thetford Mines",
      "Hôpital de Montmagny",
    ],
  },
  {
    region: "Estrie",
    institutions: [
      "CIUSSS de l'Estrie — CHUS",
      "CHUS — Hôpital Fleurimont (Sherbrooke)",
      "CHUS — Hôpital Hôtel-Dieu (Sherbrooke)",
      "Hôpital de Granby",
      "Hôpital Brome-Missisquoi-Perkins (Cowansville)",
      "Hôpital de Coaticook",
      "Hôpital de Windsor",
    ],
  },
  {
    region: "Mauricie-et-Centre-du-Québec",
    institutions: [
      "CIUSSS de la Mauricie-et-du-Centre-du-Québec",
      "Centre hospitalier régional de Trois-Rivières",
      "Hôpital Sainte-Croix (Drummondville)",
      "Centre hospitalier d'Arthabaska (Victoriaville)",
      "Hôpital du Centre-de-la-Mauricie (Shawinigan)",
      "Hôpital de La Tuque",
    ],
  },
  {
    region: "Saguenay–Lac-Saint-Jean",
    institutions: [
      "CIUSSS du Saguenay–Lac-Saint-Jean",
      "Centre hospitalier universitaire de Chicoutimi",
      "Hôpital de Jonquière",
      "Hôpital de Roberval",
      "Hôpital de Saint-Félicien",
      "Hôpital de Dolbeau-Mistassini",
      "Centre de santé et de services sociaux de Lac-Saint-Jean-Est (Alma)",
    ],
  },
  {
    region: "Bas-Saint-Laurent",
    institutions: [
      "CISSS du Bas-Saint-Laurent",
      "Centre hospitalier régional de Rimouski",
      "Centre hospitalier régional du Grand-Portage (Rivière-du-Loup)",
      "Hôpital de Matane",
      "Hôpital de Amqui",
      "Hôpital de Trois-Pistoles",
    ],
  },
  {
    region: "Gaspésie–Îles-de-la-Madeleine",
    institutions: [
      "CISSS de la Gaspésie",
      "CISSS des Îles",
      "Centre hospitalier de Maria",
      "Centre hospitalier de Gaspé",
      "Hôpital de Chandler",
      "Hôpital de Sainte-Anne-des-Monts",
      "Centre hospitalier de l'Archipel (Îles-de-la-Madeleine)",
    ],
  },
  {
    region: "Côte-Nord",
    institutions: [
      "CISSS de la Côte-Nord",
      "Centre hospitalier Le Royer (Baie-Comeau)",
      "Centre de santé et de services sociaux de Sept-Îles",
      "Centre de santé de la Minganie (Havre-Saint-Pierre)",
      "Centre de santé Chibougamau",
    ],
  },
  {
    region: "Abitibi-Témiscamingue",
    institutions: [
      "CISSS de l'Abitibi-Témiscamingue",
      "Centre hospitalier de Rouyn-Noranda",
      "Centre hospitalier d'Amos",
      "Centre hospitalier de Val-d'Or",
      "Hôpital de La Sarre",
      "Centre de santé et de services sociaux du Témiscamingue (Ville-Marie)",
    ],
  },
  {
    region: "Nord-du-Québec",
    institutions: [
      "Conseil cri de la santé et des services sociaux de la Baie James",
      "Régie régionale de la santé et des services sociaux du Nunavik",
      "Centre de santé Inuulitsivik (Puvirnituq)",
    ],
  },
  {
    region: "Autre",
    institutions: ["Autre établissement public"],
  },
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

function AddressFields({ value, onChange, lang = "fr" }: { value: Address; onChange: (a: Address) => void; lang?: "fr" | "en" }) {
  const set = (key: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });
  const isEn = lang === "en";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-1">
        <label className={labelCls}>{isEn ? "Street / civic number" : "Rue / numéro civique"}</label>
        <input type="text" value={value.street} onChange={set("street")} className={inputCls} placeholder={isEn ? "123 Main Street" : "123, rue Principale"} />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>{isEn ? "City" : "Ville"}</label>
        <input type="text" value={value.city} onChange={set("city")} className={inputCls} placeholder={isEn ? "Montreal" : "Montréal"} />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>{isEn ? "Postal code" : "Code postal"}</label>
        <input type="text" value={value.postalCode} onChange={set("postalCode")} className={inputCls} placeholder="H1A 1A1" maxLength={7} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <label className={labelCls}>{isEn ? "Province / Territory" : "Province / Territoire"}</label>
        <select value={value.province} onChange={set("province")} className={inputCls}>
          {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const T = {
  fr: {
    welcome: "Bienvenue sur MediTrackr",
    stepOf: (s: number, t: number) => `Étape ${s} sur ${t}`,
    stepLabels: ["Informations personnelles", "Catégories professionnelles", "Lieux de pratique", "Mode de facturation"],
    // Step 1
    title: "Titre", firstName: "Prénom *", lastName: "Nom *",
    ramqPractice: "Numéro de pratique RAMQ", license: "Numéro de permis / CPOM",
    specialty: "Spécialité", phone: "Téléphone", email: "Courriel",
    personalAddress: "Adresse personnelle",
    street: "Rue / numéro civique", city: "Ville", postalCode: "Code postal", province: "Province / Territoire",
    // Step 2
    profCategories: "Catégories professionnelles *",
    profCategoriesDesc: "Sélectionnez toutes les catégories qui s'appliquent. Chaque catégorie détermine les codes de facturation RAMQ accessibles.",
    selected: "Sélectionnées :",
    // Step 3
    practicePlaces: "Lieux de pratique",
    practicePlacesDesc: "Ajoutez tous les endroits où vous exercez — clinique privée, hôpital, CLSC, etc.",
    taxNumber: "Numéro de taxe TPS/TVQ",
    place: (n: number) => `Lieu ${n}`,
    publicEst: "Établissement public",
    privateClinic: "Nom de la clinique privée",
    selectEst: "— Sélectionner un établissement —",
    placeAddress: "Adresse du lieu",
    addPlace: "Ajouter un lieu de pratique",
    // Step 4
    remunerationMode: "Mode de rémunération RAMQ",
    remunerationDesc: "Sélectionnez tous les modes qui s'appliquent",
    bankInfo: "Coordonnées bancaires",
    bankInfoDesc: "Pour les rapports de paiement et la conciliation",
    bankName: "Nom de la banque", bankNamePh: "ex. Banque Royale, TD Canada Trust",
    institutionNum: "Numéro d'institution", transitNum: "Numéro de transit", accountNum: "Numéro de compte",
    // Nav
    back: "Retour", next: "Suivant", finish: "Terminer la configuration", saving: "Enregistrement...",
    // Auth screen
    confirmEmail: "Confirmez votre courriel",
    confirmEmailDesc: "Un lien de confirmation a été envoyé à votre adresse courriel. Cliquez sur ce lien, puis connectez-vous pour finaliser votre profil.",
    goToLogin: "Aller à la connexion",
  },
  en: {
    welcome: "Welcome to MediTrackr",
    stepOf: (s: number, t: number) => `Step ${s} of ${t}`,
    stepLabels: ["Personal information", "Professional categories", "Practice locations", "Billing mode"],
    // Step 1
    title: "Title", firstName: "First name *", lastName: "Last name *",
    ramqPractice: "RAMQ practice number", license: "Licence / CPOM number",
    specialty: "Specialty", phone: "Phone", email: "Email",
    personalAddress: "Personal address",
    street: "Street / civic number", city: "City", postalCode: "Postal code", province: "Province / Territory",
    // Step 2
    profCategories: "Professional categories *",
    profCategoriesDesc: "Select all categories that apply. Each category determines the RAMQ billing codes available to you.",
    selected: "Selected:",
    // Step 3
    practicePlaces: "Practice locations",
    practicePlacesDesc: "Add all locations where you practise — private clinic, hospital, CLSC, etc.",
    taxNumber: "GST/QST tax number",
    place: (n: number) => `Location ${n}`,
    publicEst: "Public institution",
    privateClinic: "Private clinic name",
    selectEst: "— Select an institution —",
    placeAddress: "Location address",
    addPlace: "Add a practice location",
    // Step 4
    remunerationMode: "RAMQ remuneration mode",
    remunerationDesc: "Select all modes that apply",
    bankInfo: "Banking information",
    bankInfoDesc: "For payment reports and reconciliation",
    bankName: "Bank name", bankNamePh: "e.g. Royal Bank, TD Canada Trust",
    institutionNum: "Institution number", transitNum: "Transit number", accountNum: "Account number",
    // Nav
    back: "Back", next: "Next", finish: "Complete setup", saving: "Saving...",
    // Auth screen
    confirmEmail: "Confirm your email",
    confirmEmailDesc: "A confirmation link was sent to your email address. Click the link, then log in to finalize your profile.",
    goToLogin: "Go to login",
  },
} as const;
type Lang = keyof typeof T;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    const stored = document.cookie.split("; ").find(r => r.startsWith("lang="))?.split("=")[1];
    if (stored === "en") setLang("en");
  }, []);

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
  const [collapsedPlaces, setCollapsedPlaces] = useState<Set<string>>(new Set());

  // Step 4
  const [selectedModes, setSelectedModes] = useState<RemunerationMode[]>([]);
  const [banking, setBanking] = useState({ bankName: "", institutionNumber: "", transitNumber: "", accountNumber: "" });

  const isDoctor = personal.prefix === "Dr." || personal.prefix === "Dre.";

  const PHYSICIAN_CATEGORIES: ProfessionalCategory[] = ['omni', 'specialist', 'resident'];
  const ALLIED_CATEGORIES: ProfessionalCategory[] = ['dietitian', 'nurse', 'inhalotherapist', 'podiatrist', 'midwife', 'orthotics_lab'];

  const visibleCategories = ALL_CATEGORIES.filter(([key]) =>
    isDoctor ? PHYSICIAN_CATEGORIES.includes(key) : ALLIED_CATEGORIES.includes(key)
  );

  const t = T[lang];

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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNeedsAuth(true); return; }

      const addressStr = [personal.address.street, personal.address.city, personal.address.province, personal.address.postalCode].filter(Boolean).join(", ");

      const { error: profileError } = await supabase.from('profiles').upsert({
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
      if (profileError) { setSubmitError(profileError.message); return; }

      const firstPlace = places[0];
      const practiceName = firstPlace?.type === "public" ? firstPlace.publicName : firstPlace?.privateName;
      const practiceAddressStr = firstPlace ? [firstPlace.address.street, firstPlace.address.city, firstPlace.address.province, firstPlace.address.postalCode].filter(Boolean).join(", ") : "";

      const { error: settingsError } = await supabase.from('practice_settings').upsert({
        user_id: user.id,
        practice_name: practiceName,
        practice_address: practiceAddressStr,
        site_appartenance: firstPlace?.type === "public" ? firstPlace.publicName : "",
        primary_facility_name: practiceName ?? "",
        primary_facility_code: "",
        tax_number: taxNumber,
        bank_name: banking.bankName,
        institution_number: banking.institutionNumber,
        transit_number: banking.transitNumber,
        account_number: banking.accountNumber,
        updated_at: new Date().toISOString(),
      });
      if (settingsError) { setSubmitError(settingsError.message); return; }

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error:', error);
      setSubmitError(error?.message || 'Erreur inattendue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (needsAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#050505] rounded-[2rem] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">{t.confirmEmail}</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            {t.confirmEmailDesc}
          </p>
        </div>
        <Button onClick={() => router.push('/login')} className="w-full bg-primary text-black font-black h-11 rounded-xl uppercase tracking-widest text-sm">
          {t.goToLogin}
        </Button>
      </div>
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
          <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase italic tracking-tighter mb-1">{t.welcome}</h1>
          <p className="text-xs text-white/40">{t.stepOf(step, TOTAL_STEPS)} — {t.stepLabels[step - 1]}</p>
        </div>

        {/* Progress */}
        <div className="relative z-10 mx-4 sm:mx-6 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {t.stepLabels.map((label, i) => (
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
                  <h2 className="text-lg font-bold text-primary uppercase tracking-wide">{t.stepLabels[0]}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>{t.title}</label>
                    <select value={personal.prefix} onChange={e => { setPersonal(p => ({ ...p, prefix: e.target.value })); setSelectedCategories([]); }} className={inputCls}>
                      <option>Dr.</option><option>Dre.</option><option>M.</option><option>Mme.</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>{t.firstName}</label>
                    <input type="text" value={personal.firstName} onChange={e => setPersonal(p => ({ ...p, firstName: e.target.value }))} className={inputCls} placeholder={lang === "en" ? "First name" : "Prénom"} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>{t.lastName}</label>
                    <input type="text" value={personal.lastName} onChange={e => setPersonal(p => ({ ...p, lastName: e.target.value }))} className={inputCls} placeholder={lang === "en" ? "Last name" : "Nom de famille"} />
                  </div>
                  {(personal.prefix === "Dr." || personal.prefix === "Dre.") && (
                    <div className="space-y-1">
                      <label className={labelCls}>{t.ramqPractice}</label>
                      <input type="text" value={personal.ramq_number} onChange={e => setPersonal(p => ({ ...p, ramq_number: e.target.value }))} className={inputCls + " font-mono"} placeholder={lang === "en" ? "6 digits" : "6 chiffres"} maxLength={6} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className={labelCls}>{t.license}</label>
                    <input type="text" value={personal.licenseNumber} onChange={e => setPersonal(p => ({ ...p, licenseNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="CPOM #" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>{t.specialty}</label>
                    <input type="text" value={personal.specialty} onChange={e => setPersonal(p => ({ ...p, specialty: e.target.value }))} className={inputCls} placeholder={lang === "en" ? "e.g. Cardiology" : "ex. Cardiologie"} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>{t.phone}</label>
                    <input type="tel" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="(514) 555-1234" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className={labelCls}>{t.email}</label>
                    <input type="email" value={personal.email} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder={lang === "en" ? "your@email.com" : "votre@courriel.com"} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.personalAddress}</p>
                  <AddressFields value={personal.address} onChange={addr => setPersonal(p => ({ ...p, address: addr }))} lang={lang} />
                </div>
              </div>
            )}

            {/* ── STEP 2: Catégories professionnelles ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-white/10">
                  <h2 className="text-lg font-bold text-primary uppercase tracking-wide mb-1">{t.profCategories}</h2>
                  <p className="text-xs text-white/40">{t.profCategoriesDesc}</p>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-primary/60 tracking-widest">{t.selected}</span>
                    {selectedCategories.map(cat => {
                      const cfg = ALL_CATEGORIES.find(([k]) => k === cat)?.[1];
                      return <span key={cat} className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">{cfg?.icon} {cfg?.labelShort}</span>;
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleCategories.map(([key, cfg]) => {
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
                    <h2 className="text-lg font-bold text-green-400 uppercase tracking-wide">{t.practicePlaces}</h2>
                    <p className="text-xs text-white/30 mt-0.5">{t.practicePlacesDesc}</p>
                  </div>
                </div>

                {/* Tax number */}
                <div className="space-y-1">
                  <label className={labelCls}>{t.taxNumber}</label>
                  <input type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} className={inputCls} placeholder={lang === "en" ? "Tax identification number" : "Numéro d'identification fiscale"} />
                </div>

                {/* Places list */}
                <div className="space-y-4">
                  {places.map((place, idx) => {
                    const isCollapsed = collapsedPlaces.has(place.id);
                    const placeName = place.type === "public" ? place.publicName : place.privateName;
                    return (
                    <div key={place.id} className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                      <div className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none"
                        onClick={() => setCollapsedPlaces(prev => {
                          const next = new Set(prev);
                          next.has(place.id) ? next.delete(place.id) : next.add(place.id);
                          return next;
                        })}>
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-sm font-bold text-white/70 shrink-0">{t.place(idx + 1)}</span>
                          {isCollapsed && placeName && (
                            <span className="text-xs text-white/40 truncate ml-1">— {placeName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {places.length > 1 && (
                            <button type="button" onClick={e => { e.stopPropagation(); setPlaces(prev => prev.filter(p => p.id !== place.id)); setCollapsedPlaces(prev => { const next = new Set(prev); next.delete(place.id); return next; }); }}
                              className="text-white/20 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isCollapsed ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronUp className="w-4 h-4 text-white/30" />}
                        </div>
                      </div>

                      {!isCollapsed && <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                      {/* Public / Privé toggle */}
                      <div className="flex gap-2">
                        {(["public", "prive"] as const).map(type => (
                          <button key={type} type="button"
                            onClick={() => updatePlace(place.id, { type })}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
                              place.type === type
                                ? type === "public" ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                : "bg-black/20 border-white/10 text-white/30 hover:border-white/30"
                            }`}>
                            {type === "public" ? (lang === "en" ? "🏥 Public" : "🏥 Public") : (lang === "en" ? "🏢 Private" : "🏢 Privé")}
                          </button>
                        ))}
                      </div>

                      {/* Name */}
                      <div className="space-y-1">
                        <label className={labelCls}>{place.type === "public" ? t.publicEst : t.privateClinic}</label>
                        {place.type === "public" ? (
                          <select value={place.publicName} onChange={e => updatePlace(place.id, { publicName: e.target.value })} className={inputCls}>
                            <option value="">{t.selectEst}</option>
                            {[...QC_PUBLIC_INSTITUTIONS]
                              .sort((a, b) => a.region === "Autre" ? 1 : b.region === "Autre" ? -1 : a.region.localeCompare(b.region, "fr"))
                              .map(({ region, institutions }) => (
                                <optgroup key={region} label={`── ${region}`}>
                                  {[...institutions].sort((a, b) => a.localeCompare(b, "fr")).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </optgroup>
                              ))}
                          </select>
                        ) : (
                          <input type="text" value={place.privateName} onChange={e => updatePlace(place.id, { privateName: e.target.value })} className={inputCls} placeholder={lang === "en" ? "Clinic or private office name" : "Nom de la clinique ou bureau privé"} />
                        )}
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{t.placeAddress}</p>
                        <AddressFields value={place.address} onChange={addr => updatePlaceAddress(place.id, addr)} lang={lang} />
                      </div>
                      </div>}
                    </div>
                  );})}
                </div>

                <button type="button" onClick={() => {
                  const newPlace = emptyPlace();
                  setCollapsedPlaces(prev => new Set([...prev, ...places.map(p => p.id)]));
                  setPlaces(prev => [...prev, newPlace]);
                }} className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/40 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> {t.addPlace}
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
                      <h2 className="text-lg font-bold text-primary uppercase tracking-wide">{t.remunerationMode}</h2>
                      <p className="text-xs text-white/30 mt-0.5">{t.remunerationDesc}</p>
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
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">{t.bankInfo}</h3>
                    <p className="text-xs text-white/30 mt-0.5">{t.bankInfoDesc}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>{t.bankName}</label>
                      <input type="text" value={banking.bankName} onChange={e => setBanking(b => ({ ...b, bankName: e.target.value }))} className={inputCls} placeholder={t.bankNamePh} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>{t.institutionNum}</label>
                      <input type="text" value={banking.institutionNumber} onChange={e => setBanking(b => ({ ...b, institutionNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="000" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>{t.transitNum}</label>
                      <input type="text" value={banking.transitNumber} onChange={e => setBanking(b => ({ ...b, transitNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder="00000" maxLength={5} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>{t.accountNum}</label>
                      <input type="text" value={banking.accountNumber} onChange={e => setBanking(b => ({ ...b, accountNumber: e.target.value }))} className={inputCls + " font-mono"} placeholder={lang === "en" ? "Account number" : "Numéro de compte"} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            {submitError && (
              <div className="mx-0 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center">
                {submitError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button onClick={() => setStep(s => s - 1)} variant="outline" className="flex-1 h-12 rounded-2xl border-white/20 text-sm">
                  {t.back}
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                  className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-12 rounded-2xl shadow-cyan disabled:opacity-40 text-sm">
                  {t.next} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading || !personal.firstName || !personal.lastName}
                  className="flex-1 bg-green-500 text-black font-bold uppercase tracking-wider h-12 rounded-2xl disabled:opacity-50 text-sm">
                  {loading ? t.saving : t.finish} <Save className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
