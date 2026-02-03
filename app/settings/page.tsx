"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  User, Building2, Plus, ArrowLeft, Save, 
  ClipboardList, LayoutDashboard, FileStack, PieChart, Settings, Trash2, CreditCard
} from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    prefix: "Dr.",
    firstName: "",
    lastName: "",
    licenseNumber: "",
    specialty: "",
    phone: "",
    email: "",
    address: ""
  });

  // Practice data
  const [practiceData, setPracticeData] = useState({
    practiceName: "",
    practiceAddress: "",
    siteAppartenance: "",
    taxNumber: "",
    bankName: "",
    institutionNumber: "",
    transitNumber: "",
    accountNumber: ""
  });

  // Partners/Billing entities
  const [billingEntities, setBillingEntities] = useState([]);
  const [newEntity, setNewEntity] = useState({ name: "", phone: "", email: "", contact: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileData({
            prefix: profile.prefix || "Dr.",
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            licenseNumber: profile.license_number || "",
            specialty: profile.specialty || "",
            phone: profile.phone || "",
            email: profile.email || "",
            address: profile.address || ""
          });
        }

        // Fetch practice settings
        const { data: practice } = await supabase
          .from('practice_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (practice) {
          setPracticeData({
            practiceName: practice.practice_name || "",
            practiceAddress: practice.practice_address || "",
            siteAppartenance: practice.site_appartenance || "",
            taxNumber: practice.tax_number || "",
            bankName: practice.bank_name || "",
            institutionNumber: practice.institution_number || "",
            transitNumber: practice.transit_number || "",
            accountNumber: practice.account_number || ""
          });
        }

        // Fetch partners
        const { data: partners } = await supabase
          .from('partners')
          .select('*')
          .eq('user_id', user.id);

        if (partners) {
          setBillingEntities(partners.map(p => ({
            id: p.id,
            name: p.name || "",
            phone: p.phone || "",
            email: p.email || "",
            contact: p.contact_person || ""
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePracticeChange = (field: string, value: string) => {
    setPracticeData(prev => ({ ...prev, [field]: value }));
  };

  const addBillingEntity = async () => {
    if (newEntity.name) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from('partners')
          .insert([{
            user_id: user.id,
            name: newEntity.name,
            phone: newEntity.phone,
            email: newEntity.email,
            contact_person: newEntity.contact
          }])
          .select()
          .single();

        if (error) throw error;

        setBillingEntities([...billingEntities, {
          id: data.id,
          name: newEntity.name,
          phone: newEntity.phone,
          email: newEntity.email,
          contact: newEntity.contact
        }]);
        
        setNewEntity({ name: "", phone: "", email: "", contact: "" });
        alert('Billing entity added successfully!');
      } catch (error) {
        console.error('Error adding entity:', error);
        alert('Error adding billing entity');
      }
    }
  };

  const deleteBillingEntity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBillingEntities(billingEntities.filter(e => e.id !== id));
      alert('Billing entity deleted successfully!');
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('Error deleting billing entity');
    }
  };

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          prefix: profileData.prefix,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          license_number: profileData.licenseNumber,
          specialty: profileData.specialty,
          phone: profileData.phone,
          email: profileData.email,
          address: profileData.address,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Update practice settings
      const { error: practiceError } = await supabase
        .from('practice_settings')
        .upsert({
          user_id: user.id,
          practice_name: practiceData.practiceName,
          practice_address: practiceData.practiceAddress,
          site_appartenance: practiceData.siteAppartenance,
          tax_number: practiceData.taxNumber,
          bank_name: practiceData.bankName,
          institution_number: practiceData.institutionNumber,
          transit_number: practiceData.transitNumber,
          account_number: practiceData.accountNumber,
          updated_at: new Date().toISOString()
        });

      if (practiceError) throw practiceError;

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-primary text-xl animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex justify-center items-center overflow-hidden p-4">
      <div className="w-full max-w-6xl h-[92vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <Image src="/images/meditrackr logo.png" alt="Logo" width={600} height={600} className="opacity-10" priority />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-20 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <Image src="/images/meditrackr logo.png" alt="Logo" width={32} height={32} />
            <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Settings</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="relative z-10 flex-1 overflow-hidden flex px-6 pb-6 gap-6">
          
          <aside className="w-64 flex-shrink-0 space-y-6">
            <nav className="space-y-1">
              <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-white/60">
                <LayoutDashboard className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Dashboard</span>
              </Link>
              <Link href="/invoices" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-white/60">
                <FileStack className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">View Invoices</span>
              </Link>
              <Link href="/budgets" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-white/60">
                <PieChart className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider">View Budgets</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-white shadow-cyan">
                <Settings className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
              </Link>
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 pb-12">
            
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 shadow-cyan/20">
              <ClipboardList className="text-primary w-5 h-5" />
              <h2 className="text-[11px] font-black text-primary uppercase tracking-widest">Account Settings</h2>
            </div>

            {/* PERSONAL INFORMATION */}
            <div className="card-medical p-8 border border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl relative shadow-cyan">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Prefix</label>
                  <select value={profileData.prefix} onChange={e => handleProfileChange('prefix', e.target.value)} className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white">
                    <option>Dr.</option><option>Mr.</option><option>Ms.</option><option>Mrs.</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">First Name</label>
                  <input type="text" value={profileData.firstName} onChange={e => handleProfileChange('firstName', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Last Name</label>
                  <input type="text" value={profileData.lastName} onChange={e => handleProfileChange('lastName', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">License Number</label>
                  <input type="text" value={profileData.licenseNumber} onChange={e => handleProfileChange('licenseNumber', e.target.value)} placeholder="CPOM #" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Specialty</label>
                  <input type="text" value={profileData.specialty} onChange={e => handleProfileChange('specialty', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Phone</label>
                  <input type="tel" value={profileData.phone} onChange={e => handleProfileChange('phone', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Email</label>
                  <input type="email" value={profileData.email} onChange={e => handleProfileChange('email', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Address</label>
                  <input type="text" value={profileData.address} onChange={e => handleProfileChange('address', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
              </div>
            </div>

            {/* PRACTICE INFORMATION */}
            <div className="card-medical p-8 border border-white/5 bg-black/40 rounded-2xl relative shadow-green">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="text-green-400 w-5 h-5" />
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">Practice Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Practice Name</label>
                  <input type="text" value={practiceData.practiceName} onChange={e => handlePracticeChange('practiceName', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Practice Address</label>
                  <input type="text" value={practiceData.practiceAddress} onChange={e => handlePracticeChange('practiceAddress', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Site d'Appartenance</label>
                  <input type="text" value={practiceData.siteAppartenance} onChange={e => handlePracticeChange('siteAppartenance', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Tax Number</label>
                  <input type="text" value={practiceData.taxNumber} onChange={e => handlePracticeChange('taxNumber', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
              </div>
            </div>

            {/* BANKING INFORMATION */}
            <div className="card-medical p-8 border border-white/5 bg-black/40 rounded-2xl relative shadow-orange">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-orange-400 w-5 h-5" />
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest">Banking Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Bank Name</label>
                  <input type="text" value={practiceData.bankName} onChange={e => handlePracticeChange('bankName', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Institution Number</label>
                  <input type="text" value={practiceData.institutionNumber} onChange={e => handlePracticeChange('institutionNumber', e.target.value)} maxLength={3} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Transit Number</label>
                  <input type="text" value={practiceData.transitNumber} onChange={e => handlePracticeChange('transitNumber', e.target.value)} maxLength={5} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] uppercase font-bold opacity-40">Account Number</label>
                  <input type="text" value={practiceData.accountNumber} onChange={e => handlePracticeChange('accountNumber', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono" />
                </div>
              </div>
            </div>

            {/* BILLING ENTITIES */}
            <div className="card-medical p-8 border border-white/5 bg-black/40 rounded-2xl relative shadow-cyan">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Billing Partners</h3>
              
              {/* Existing entities */}
              {billingEntities.length > 0 && (
                <div className="mb-6 space-y-3">
                  {billingEntities.map((entity) => (
                    <div key={entity.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{entity.name}</p>
                        <p className="text-xs text-white/40">{entity.contact} • {entity.email || entity.phone}</p>
                      </div>
                      <Button
                        onClick={() => deleteBillingEntity(entity.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new entity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Company Name" value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} className="bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                <input type="text" placeholder="Contact Person" value={newEntity.contact} onChange={e => setNewEntity({...newEntity, contact: e.target.value})} className="bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                <input type="email" placeholder="Email" value={newEntity.email} onChange={e => setNewEntity({...newEntity, email: e.target.value})} className="bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
                <input type="tel" placeholder="Phone" value={newEntity.phone} onChange={e => setNewEntity({...newEntity, phone: e.target.value})} className="bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white" />
              </div>
              <Button onClick={addBillingEntity} className="w-full bg-primary/10 text-primary border border-primary/20 h-11">
                <Plus className="w-4 h-4 mr-2" /> Add Billing Partner
              </Button>
            </div>

            {/* SAVE BUTTON */}
            <Button 
              onClick={saveAllSettings}
              disabled={saving}
              className="w-full bg-primary text-black font-black uppercase tracking-[0.3em] h-16 rounded-3xl shadow-cyan active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-6 h-6 mr-3" /> {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
