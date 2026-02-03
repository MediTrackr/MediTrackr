"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Save, Loader2, CheckCircle } from "lucide-react";
import { ALL_CATEGORIES, ProfessionalCategory, getCategoryConfig, REMUNERATION_MODES, RemunerationMode } from "@/utils/ramq-categories";

export default function Profile() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    prefix: "Dr.",
    firstName: "",
    lastName: "",
    ramq_number: "",
    licenseNumber: "",
    specialty: "",
    phone: "",
    email: "",
    address: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<ProfessionalCategory[]>([]);
  const [selectedModes, setSelectedModes] = useState<RemunerationMode[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setFormData({
            prefix: data.prefix || "Dr.",
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            ramq_number: data.ramq_number || "",
            licenseNumber: data.license_number || "",
            specialty: data.specialty || "",
            phone: data.phone || "",
            email: data.email || user.email || "",
            address: data.address || "",
          });
          setSelectedCategories((data.professional_categories as ProfessionalCategory[]) || []);
          setSelectedModes((data.remuneration_modes as RemunerationMode[]) || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        professional_categories: selectedCategories,
        remuneration_modes: selectedModes,
        prefix: formData.prefix,
        first_name: formData.firstName,
        last_name: formData.lastName,
        ramq_number: formData.ramq_number,
        license_number: formData.licenseNumber,
        specialty: formData.specialty,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Échec de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: ProfessionalCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  const toggleMode = (mode: RemunerationMode) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary text-glow">Paramètres du profil</h1>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Professional categories — multi-select */}
          <div className="rounded-lg border border-primary-500/10 bg-secondary-900/50 overflow-hidden">
            <div className="p-6 border-b border-primary-500/10 flex items-center gap-2">
              <span className="text-xl">🏥</span>
              <div>
                <h2 className="text-xl font-semibold">Catégories professionnelles RAMQ</h2>
                {selectedCategories.length > 0 && (
                  <p className="text-xs text-primary mt-0.5">{selectedCategories.length} catégorie{selectedCategories.length > 1 ? 's' : ''} sélectionnée{selectedCategories.length > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs text-white/40 mb-4">
                Sélectionnez toutes les catégories qui s&apos;appliquent. Chaque catégorie donne accès à ses propres codes de facturation RAMQ.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ALL_CATEGORIES.map(([key, cfg]) => {
                  const selected = selectedCategories.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCategory(key)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 bg-black/20 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight ${selected ? 'text-primary' : 'text-white'}`}>{cfg.label}</p>
                        <p className="text-[9px] text-white/30 font-mono mt-0.5">{cfg.providerNote}</p>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                        {selected && <CheckCircle className="w-3 h-3 text-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Remuneration modes — multi-select */}
          <div className="rounded-lg border border-primary-500/10 bg-secondary-900/50 overflow-hidden">
            <div className="p-6 border-b border-primary-500/10">
              <h2 className="text-xl font-semibold">Mode de rémunération RAMQ</h2>
              <p className="text-xs text-white/40 mt-1">Sélectionnez tous les modes applicables à votre pratique</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(REMUNERATION_MODES) as [RemunerationMode, { label: string; description: string }][]).map(([mode, info]) => {
                const selected = selectedModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => toggleMode(mode)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${selected ? 'bg-primary text-black' : 'bg-white/10 text-white/50'}`}>
                      {mode}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${selected ? 'text-primary' : 'text-white'}`}>{info.label}</p>
                      <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{info.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal info */}
          <div className="rounded-lg border border-primary-500/10 bg-secondary-900/50 overflow-hidden">
            <div className="p-6 border-b border-primary-500/10 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Informations personnelles</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Titre</label>
                <select value={formData.prefix} onChange={e => setFormData(p => ({ ...p, prefix: e.target.value }))}
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground">
                  <option>Dr.</option><option>Dre.</option><option>M.</option><option>Mme.</option>
                </select>
              </div>
              {([
                ["Prénom", "firstName", "text", "Prénom"],
                ["Nom", "lastName", "text", "Nom de famille"],
              ] as const).map(([label, key, type, ph]) => (
                <div key={key} className="space-y-1">
                  <label className="block text-sm font-medium text-foreground/70">{label}</label>
                  <input type={type} value={formData[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary-500/40" />
                </div>
              ))}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground/70">
                  Numéro RAMQ du professionnel
                </label>
                <input
                  type="text"
                  value={formData.ramq_number}
                  onChange={e => setFormData(p => ({ ...p, ramq_number: e.target.value }))}
                  placeholder={selectedCategories.length === 1 ? (getCategoryConfig(selectedCategories[0])?.providerNote ?? '6 chiffres') : '6 chiffres'}
                  maxLength={6}
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground font-mono focus:outline-none focus:border-primary-500/40"
                />
                {selectedCategories.length === 1 && (
                  <p className="text-[9px] text-white/30">Format : {getCategoryConfig(selectedCategories[0])?.providerNote}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Numéro de permis / CPOM</label>
                <input type="text" value={formData.licenseNumber} onChange={e => setFormData(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="CPOM #"
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground font-mono focus:outline-none focus:border-primary-500/40" />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Spécialité / Discipline</label>
                <input type="text" value={formData.specialty} onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))} placeholder="ex. Cardiologie"
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary-500/40" />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Téléphone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(514) 555-1234"
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary-500/40" />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Courriel</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="votre@courriel.com"
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary-500/40" />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-foreground/70">Adresse</label>
                <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Rue, Ville, Province, Code postal"
                  className="w-full bg-secondary-900/50 border border-primary-500/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary-500/40" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2 min-w-[160px] bg-primary text-black font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? 'Sauvegardé ✓' : saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
