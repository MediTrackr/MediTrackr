"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import SmartScanner, { SmartScanCardData } from "@/components/SmartScanner";
import { getCategoryConfig, ALL_CATEGORIES, ProfessionalCategory } from "@/utils/ramq-categories";

interface PlaceOfWork {
  id: string;
  type: "public" | "prive";
  publicName: string;
  privateName: string;
  address: { street: string; city: string; province: string; postalCode: string };
}

const ROLES: Record<string, string> = {
  "1": "Rôle 1 — Médecin traitant principal",
  "2": "Rôle 2 — Médecin en continuité (début par autre)",
  "3": "Rôle 3 — Médecin remplaçant en continuité",
  "4": "Rôle 4 — Médecin consultant",
  "5": "Rôle 5 — Médecin assistant",
};

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();
  const lineItemIdRef = useRef(2);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableCodes, setAvailableCodes] = useState<{ code: string; description: string; fee_base: number }[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [lmpDate, setLmpDate] = useState("");
  const [showLmpPrompt, setShowLmpPrompt] = useState(false);
  const [showDeliverySupplement, setShowDeliverySupplement] = useState(false);
  const [showNightPremium, setShowNightPremium] = useState(false);
  const [profileCategories, setProfileCategories] = useState<ProfessionalCategory[]>([]);
  const [profileCategory, setProfileCategory] = useState<ProfessionalCategory | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [placesOfWork, setPlacesOfWork] = useState<PlaceOfWork[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

  const [lineItems, setLineItems] = useState([
    { id: 1, description: "", code: "", quantity: 1, unitPrice: 0 }
  ]);

  const [formData, setFormData] = useState({
    doctor_ramq: "",
    location_code: "",
    territory_premium: "",
    role: "1",
    patientName: "",
    patientRAMQ: "",
    patient_birth: "",
    patientEmail: "",
    patientPhone: "",
    diagnostic_code: "",
    diagnostic_desc: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    serviceTime: "",
    start_time: "",
    end_time: "",
    dueDate: "",
    partnerType: "patient",
    partnerId: "",
    notes: ""
  });

  const cfg = profileCategory ? getCategoryConfig(profileCategory) : null;

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase
          .from('profiles')
          .select('professional_categories, patient_count, ramq_number, locality_code, tariff_territory')
          .eq('id', user.id)
          .single(),
        supabase
          .from('practice_settings')
          .select('places_of_work')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (profile) {
        const cats: ProfessionalCategory[] = profile.professional_categories || [];
        setProfileCategories(cats);
        if (cats.length === 1) setProfileCategory(cats[0]);
        if (profile.patient_count) setPatientCount(profile.patient_count);
        setFormData(prev => ({
          ...prev,
          doctor_ramq: profile.ramq_number || "",
          location_code: profile.locality_code || "",
          territory_premium: profile.tariff_territory || "",
        }));
      }

      if (settings?.places_of_work) {
        try {
          const parsed: PlaceOfWork[] = typeof settings.places_of_work === 'string'
            ? JSON.parse(settings.places_of_work)
            : settings.places_of_work;
          setPlacesOfWork(parsed);
          if (parsed.length === 1) {
            setSelectedPlaceId(parsed[0].id);
            setFormData(prev => ({
              ...prev,
              partnerType: parsed[0].type === 'public' ? 'ramq' : 'patient',
            }));
          }
        } catch {}
      }

      setProfileLoaded(true);
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (searchTerm.length <= 1 || !profileCategory) {
      setAvailableCodes([]);
      return;
    }
    const categoryConfig = getCategoryConfig(profileCategory);
    if (!categoryConfig) return;

    const fetchCodes = async () => {
      const { data } = await supabase
        .from('ramq_codes')
        .select('*')
        .ilike('description', `%${searchTerm}%`)
        .eq('specialty_group', categoryConfig.specialtyGroup)
        .limit(8);
      if (data) setAvailableCodes(data);
    };
    fetchCodes();
  }, [searchTerm, profileCategory]);

  const isDeliveryOffHours = (): boolean => {
    const date = new Date(formData.invoiceDate);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) return true;
    if (!formData.serviceTime) return false;
    const [h] = formData.serviceTime.split(':').map(Number);
    return h >= 19 || h < 7;
  };

  const isNightHours = (): boolean => {
    if (!formData.start_time) return false;
    const [h] = formData.start_time.split(':').map(Number);
    return h >= 20 || h < 8;
  };

  const resolveObstetricsCode = (code: string): string => {
    if (!cfg?.showObstetrics) return code;
    const large = patientCount >= 500;
    const map: Record<string, string> = {
      '15825': large ? '15826' : '15825',
      '15826': large ? '15826' : '15825',
      '15829': large ? '15830' : '15829',
      '15830': large ? '15830' : '15829',
      '15831': large ? '15832' : '15831',
      '15832': large ? '15832' : '15831',
    };
    return map[code] || code;
  };

  const handleSelectCode = (index: number, selectedCode: { code: string; description: string; fee_base: number }) => {
    const resolvedCode = resolveObstetricsCode(selectedCode.code);
    const isPriseEnCharge = ['15825', '15826', '15829', '15830'].includes(resolvedCode);
    const isDelivery = resolvedCode === '06945';

    setShowLmpPrompt(cfg?.showLmp && isPriseEnCharge ? true : false);
    setShowDeliverySupplement(cfg?.showObstetrics && isDelivery && isDeliveryOffHours() ? true : false);
    setShowNightPremium(isNightHours());

    const newLineItems = [...lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      code: resolvedCode,
      description: selectedCode.description,
      unitPrice: selectedCode.fee_base
    };
    setLineItems(newLineItems);
    setSearchTerm("");
    setAvailableCodes([]);
  };

  // Read scan data passed via sessionStorage from the standalone scanner page
  useEffect(() => {
    const raw = sessionStorage.getItem("smartscan_card");
    if (!raw) return;
    try {
      const data: SmartScanCardData = JSON.parse(raw);
      sessionStorage.removeItem("smartscan_card");
      handleScanCardData(data);
    } catch { /* ignore */ }
  }, []);

  function handleScanCardData(data: SmartScanCardData) {
    setFormData(prev => ({
      ...prev,
      patientName: data.fullName || prev.patientName,
      patientRAMQ: data.memberId || prev.patientRAMQ,
      patient_birth: data.dob || prev.patient_birth,
      partnerType:
        data.billingRecommendation === "RAMQ"             ? "ramq"
        : data.billingRecommendation === "PRIVATE_INSURANCE" ? (data.billingTarget === "insurer" ? "insurance" : "patient")
        : data.billingRecommendation === "OUT_OF_PROVINCE"   ? "insurance"
        : prev.partnerType,
    }));
  }

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
    const place = placesOfWork.find(p => p.id === placeId);
    if (place) {
      setFormData(prev => ({
        ...prev,
        partnerType: place.type === 'public' ? 'ramq' : 'patient',
      }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: lineItemIdRef.current++, description: "", code: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (id: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: number, field: string, value: string | number) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const totalAmount = calculateTotal();

      if (formData.partnerType === 'ramq') {
        // Re-resolve obstetrics codes at submit time in case patientCount changed after selection
        const actCodes = lineItems.map(item => ({
          code: resolveObstetricsCode(item.code),
          description: item.description,
          quantity: item.quantity,
          fee: item.unitPrice
        }));

        const { error } = await supabase.from('ramq_claims').insert({
          user_id: user.id,
          professional_category: profileCategory,
          patient_name: formData.patientName,
          patient_ramq: formData.patientRAMQ,
          patient_dob: formData.patient_birth || null,
          service_date: formData.invoiceDate,
          start_time: cfg?.showStartEnd ? (formData.start_time || null) : null,
          end_time: cfg?.showStartEnd ? (formData.end_time || null) : null,
          doctor_ramq: formData.doctor_ramq || null,
          location_code: formData.location_code || null,
          territory_premium: formData.territory_premium || null,
          role: cfg?.showRole ? formData.role : null,
          lmp_date: cfg?.showLmp && lmpDate ? lmpDate : null,
          act_codes: actCodes,
          total_claimed: totalAmount,
          diagnostic_code: formData.diagnostic_code || null,
          diagnostic_desc: formData.diagnostic_desc || null,
          status: 'draft',
          notes: formData.notes,
        });

        if (error) throw error;
        alert('Réclamation RAMQ créée — statut : BROUILLON');
        router.push('/claims/ramq');
        return;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: formData.invoiceNumber,
          patient_name: formData.patientName,
          patient_ramq: formData.patientRAMQ,
          invoice_date: formData.invoiceDate,
          due_date: formData.dueDate,
          total_amount: totalAmount,
          amount_paid: 0,
          status: 'pending',
          partner_type: formData.partnerType,
          partner_id: formData.partnerId || null,
          notes: formData.notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      await supabase.from('invoice_line_items').insert(
        lineItems.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          procedure_code: item.code,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))
      );

      alert('Facture créée avec succès!');
      router.push('/dashboard/invoice');
    } catch (error) {
      console.error('Error:', error);
      alert('Échec de la création');
    } finally {
      setSaving(false);
    }
  };

  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/40">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-primary"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">
              Nouvelle facture
            </h1>
            {cfg && (
              <p className="text-xs text-white/40 mt-1">
                {cfg.icon} {cfg.label}
              </p>
            )}
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </Link>
        </div>

        {/* Multi-category picker — shown when user has more than one category */}
        {profileCategories.length > 1 && (
          <div className="relative z-10 mx-6 mb-4 p-4 bg-black/60 border border-white/10 rounded-2xl">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-3">
              Vous pratiquez dans plusieurs catégories — laquelle s&apos;applique à cette réclamation ?
            </p>
            <div className="flex flex-wrap gap-2">
              {profileCategories.map(cat => {
                const c = ALL_CATEGORIES.find(([k]) => k === cat)?.[1];
                if (!c) return null;
                const active = profileCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProfileCategory(cat)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                    }`}
                  >
                    {c.icon} {c.labelShort}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No category set — warn the user */}
        {profileCategories.length === 0 && (
          <div className="relative z-10 mx-6 mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-yellow-400">Catégorie professionnelle non définie</p>
              <p className="text-xs text-yellow-400/70">
                Les codes de facturation RAMQ ne peuvent pas être filtrés. <Link href="/profile" className="underline">Mettez votre profil à jour</Link> pour définir votre catégorie.
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            <SmartScanner onCardData={handleScanCardData} />

            {/* Place of work selector */}
            {placesOfWork.length > 0 && (
              <div className="card-medical p-6 border-l-4 border-blue-400">
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Lieu de dispensation</h2>
                <div className="flex flex-wrap gap-2">
                  {placesOfWork.map(place => {
                    const name = place.type === 'public' ? place.publicName : place.privateName;
                    const isSelected = selectedPlaceId === place.id;
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => handlePlaceSelect(place.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                          isSelected
                            ? place.type === 'public'
                              ? 'border-blue-400 bg-blue-500/15 text-blue-300'
                              : 'border-yellow-400/70 bg-yellow-500/10 text-yellow-300'
                            : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80'
                        }`}
                      >
                        <span>{place.type === 'public' ? '🏥' : '🏢'}</span>
                        <span className="truncate max-w-[220px]">{name || (place.type === 'public' ? 'Établissement public' : 'Clinique privée')}</span>
                        {isSelected && (
                          <span className={`text-[9px] uppercase font-black tracking-widest ml-1 ${place.type === 'public' ? 'text-blue-400' : 'text-yellow-400'}`}>
                            → {place.type === 'public' ? 'RAMQ' : 'Privé'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedPlaceId && (
                  <p className="text-[10px] text-white/30 mt-3">
                    Mode de facturation pré-sélectionné selon le type de lieu. Vous pouvez le modifier ci-dessous.
                  </p>
                )}
              </div>
            )}

            {/* Patient */}
            <div className="card-medical p-6 border-l-4 border-primary">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Informations du patient</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Nom complet *</label>
                  <input type="text" value={formData.patientName} onChange={(e) => setFormData({...formData, patientName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="Nom complet" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">NAM (Numéro d&apos;assurance maladie)</label>
                  <input type="text" value={formData.patientRAMQ} onChange={(e) => setFormData({...formData, patientRAMQ: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" placeholder="XXXX 1234 5678" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Date de naissance</label>
                  <input type="date" value={formData.patient_birth} onChange={(e) => setFormData({...formData, patient_birth: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Téléphone</label>
                  <input type="tel" value={formData.patientPhone} onChange={(e) => setFormData({...formData, patientPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="(514) 555-1234" />
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="card-medical p-6 border-l-4 border-green-400">
              <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">Détails de facturation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Mode de facturation *</label>
                  <select value={formData.partnerType} onChange={(e) => setFormData({...formData, partnerType: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                    <option value="patient">Patient (paiement privé / Stripe)</option>
                    <option value="ramq">RAMQ (Assurance maladie du Québec)</option>
                    <option value="insurance">Assurance privée (Desjardins, Sun Life, etc.)</option>
                    <option value="pfsi">PFSI / IFHP — Medavie Blue Cross (réfugiés)</option>
                    <option value="canassistance">CanAssistance / Croix Bleue (assurance voyage)</option>
                  </select>
                </div>

                {(formData.partnerType === 'pfsi' || formData.partnerType === 'canassistance') && (
                  <div className="md:col-span-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-3">
                    <span className="text-lg shrink-0">{formData.partnerType === 'pfsi' ? '🛡️' : '✈️'}</span>
                    <div>
                      <p className="text-xs font-bold text-indigo-300">
                        {formData.partnerType === 'pfsi' ? 'Réclamation PFSI / IFHP' : 'Réclamation CanAssistance / Croix Bleue'}
                      </p>
                      <p className="text-[10px] text-indigo-300/60 mt-1 leading-relaxed">
                        Une fois la facture enregistrée, vous pourrez l&apos;imprimer avec toutes les informations nécessaires pour que votre patient puisse la soumettre à son assureur.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Date du service</label>
                  <input type="date" value={formData.invoiceDate} onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>

                {cfg?.showStartEnd && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Heure de début</label>
                      <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value, serviceTime: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold opacity-40">Heure de fin</label>
                      <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                    </div>
                  </>
                )}

                {cfg?.showRole && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Rôle du médecin</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                      {Object.entries(ROLES).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Code du lieu de dispensation</label>
                  <input type="text" value={formData.location_code} onChange={(e) => setFormData({...formData, location_code: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" placeholder="5 chiffres" maxLength={5} />
                </div>

                {formData.partnerType !== 'ramq' && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Date d&apos;échéance</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic — RAMQ only */}
            {formData.partnerType === 'ramq' && (
              <div className="card-medical p-6 border-l-4 border-purple-400">
                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">Diagnostic (CIM-9 / CIM-10) — Requis FacturActe</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Code diagnostique *</label>
                    <input type="text" value={formData.diagnostic_code} onChange={(e) => setFormData({...formData, diagnostic_code: e.target.value.toUpperCase()})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" placeholder="ex. J00, Z00.0" maxLength={10} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-40">Description du diagnostic</label>
                    <input type="text" value={formData.diagnostic_desc} onChange={(e) => setFormData({...formData, diagnostic_desc: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" placeholder="ex. Rhinopharyngite aiguë" />
                  </div>
                </div>
              </div>
            )}

            {/* Act codes / line items */}
            <div className="card-medical p-6 border-l-4 border-primary">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
                  Actes / Procédures
                  {cfg && <span className="ml-2 text-white/30 normal-case font-normal">— {cfg.labelShort}</span>}
                </h2>
                <Button onClick={addLineItem} size="sm" className="gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-12 md:col-span-5 relative">
                        <label className="text-[9px] uppercase font-bold opacity-40">
                          {profileCategory ? 'Rechercher un acte' : 'Description'}{' '}
                          <Search className="inline w-3 h-3" />
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                            placeholder={profileCategory ? "Tapez pour rechercher..." : "Description du service"}
                            value={item.code ? item.description : searchTerm}
                            onChange={(e) => {
                              if (item.code) updateLineItem(item.id, 'description', e.target.value);
                              else setSearchTerm(e.target.value);
                            }}
                          />
                          {availableCodes.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-[#111] border border-white/20 rounded-lg shadow-xl">
                              {availableCodes.map((c) => (
                                <div key={c.code} className="p-3 hover:bg-primary/10 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center" role="button" tabIndex={0} onClick={() => handleSelectCode(index, c)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectCode(index, c); }}>
                                  <span className="text-sm font-bold text-primary font-mono">{c.code}</span>
                                  <span className="text-xs text-white/60 flex-1 mx-3 truncate">{c.description}</span>
                                  <span className="text-xs font-mono text-primary">${c.fee_base}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase font-bold opacity-40">Code</label>
                        <div className="p-2 bg-black/20 border border-white/5 rounded text-sm text-primary font-mono">
                          {item.code || "—"}
                        </div>
                      </div>

                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase font-bold opacity-40">Qté</label>
                        <input type="number" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 0))} className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white" min={1} />
                      </div>

                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase font-bold opacity-40">Prix unitaire</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-white"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        {lineItems.length > 1 && (
                          <Button onClick={() => removeLineItem(item.id)} size="sm" variant="ghost" className="w-full text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Night premium prompt */}
              {showNightPremium && cfg?.showStartEnd && (
                <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-indigo-400">Quart de nuit détecté (20h–8h)</p>
                    <p className="text-xs text-white/40 mt-1">Ajouter la majoration de nuit MOD 097 ?</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setLineItems(prev => [...prev, { id: Date.now(), description: 'Majoration de nuit (MOD 097)', code: '097', quantity: 1, unitPrice: 0 }]); setShowNightPremium(false); }} className="text-xs px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 hover:bg-indigo-500/20">+ MOD 097</button>
                    <button type="button" onClick={() => setShowNightPremium(false)} className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40">Ignorer</button>
                  </div>
                </div>
              )}

              {/* LMP prompt */}
              {showLmpPrompt && cfg?.showLmp && (
                <div className="mt-4 p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl space-y-1">
                  <label className="text-[9px] uppercase font-bold text-pink-400">Date des dernières menstruations (LMP) — Requis pour prise en charge</label>
                  <input type="date" value={lmpDate} onChange={(e) => setLmpDate(e.target.value)} className="w-full bg-black/40 border border-pink-500/20 p-2 rounded-lg text-sm text-white" />
                </div>
              )}

              {/* Delivery supplement */}
              {showDeliverySupplement && cfg?.showObstetrics && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-[9px] uppercase font-bold text-yellow-400 mb-3">Accouchement hors horaire — Supplément applicable ?</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { code: '06903', label: 'Garde (06903)' },
                      { code: '06984', label: 'Soir/Nuit (06984)' },
                      { code: '06985', label: 'Fin de semaine (06985)' },
                    ].map(s => (
                      <button key={s.code} type="button" onClick={() => { setLineItems(prev => [...prev, { id: Date.now(), description: s.label, code: s.code, quantity: 1, unitPrice: 0 }]); setShowDeliverySupplement(false); }} className="text-xs px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/20">+ {s.label}</button>
                    ))}
                    <button type="button" onClick={() => setShowDeliverySupplement(false)} className="text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40">Ignorer</button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Montant total</p>
                  <p className="text-3xl font-bold text-primary">${calculateTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card-medical p-6">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Notes internes</h2>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white min-h-[80px]" placeholder="Notes ou commentaires..." />
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSubmit} disabled={saving || !formData.patientName} className="flex-1 bg-primary text-black font-bold uppercase h-14 rounded-2xl shadow-cyan">
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Enregistrement...' : (formData.partnerType === 'ramq' ? 'Créer réclamation RAMQ' : 'Enregistrer la facture')}
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/20">Annuler</Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
