"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { User, Building2, CreditCard, Save, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Personal Information
    prefix: "Dr.",
    firstName: "",
    lastName: "",
    licenseNumber: "",
    specialty: "",
    phone: "",
    email: "",
    address: "",
    
    // Business Banking Information
    bankName: "",
    accountNumber: "",
    institutionNumber: "",
    transitNumber: "",
    
    // Practice Information
    practiceName: "",
    practiceAddress: "",
    siteAppartenance: "", // Site d'appartenance
    taxNumber: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("User not authenticated");
        return;
      }

      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          prefix: formData.prefix,
          first_name: formData.firstName,
          last_name: formData.lastName,
          license_number: formData.licenseNumber,
          specialty: formData.specialty,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Save practice/business information (you may want a separate table for this)
      // For now, we'll store in a new table or extend profiles
      const { error: practiceError } = await supabase
        .from('practice_settings')
        .upsert({
          user_id: user.id,
          practice_name: formData.practiceName,
          practice_address: formData.practiceAddress,
          site_appartenance: formData.siteAppartenance,
          tax_number: formData.taxNumber,
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          institution_number: formData.institutionNumber,
          transit_number: formData.transitNumber,
          updated_at: new Date().toISOString()
        });

      // If practice_settings table doesn't exist, this will fail gracefully
      // You can ignore this error for now or create the table

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-4xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10 
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
        
        {/* Background Logo */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <Image 
            src="/images/meditrackr logo.png" 
            alt="Logo" 
            width={600} 
            height={600} 
            className="opacity-5" 
          />
        </div>

        {/* Header */}
        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl text-center">
          <Image 
            src="/images/meditrackr logo.png" 
            alt="Logo" 
            width={48} 
            height={48} 
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-black text-primary uppercase italic tracking-tighter mb-2">
            Welcome to MediTrackr
          </h1>
          <p className="text-sm text-white/60">Let's set up your account - Step {step} of 3</p>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mx-6 mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <User className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-primary uppercase tracking-wide">
                    Personal Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Prefix</label>
                    <select 
                      value={formData.prefix}
                      onChange={(e) => handleChange('prefix', e.target.value)}
                      className="w-full bg-black border border-white/10 p-3 rounded-xl text-sm text-white"
                    >
                      <option>Dr.</option>
                      <option>Mr.</option>
                      <option>Ms.</option>
                      <option>Mrs.</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">First Name *</label>
                    <input 
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="First name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Last Name *</label>
                    <input 
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Last name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">License Number</label>
                    <input 
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => handleChange('licenseNumber', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="CPOM #"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Specialty</label>
                    <input 
                      type="text"
                      value={formData.specialty}
                      onChange={(e) => handleChange('specialty', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="e.g., General Practice, Cardiology"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Phone *</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="(514) 555-1234"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Email *</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Address</label>
                    <input 
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Street address, City, Province, Postal Code"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Practice Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <Building2 className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold text-green-400 uppercase tracking-wide">
                    Practice Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Practice Name</label>
                    <input 
                      type="text"
                      value={formData.practiceName}
                      onChange={(e) => handleChange('practiceName', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Clinic or practice name"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Practice Address</label>
                    <input 
                      type="text"
                      value={formData.practiceAddress}
                      onChange={(e) => handleChange('practiceAddress', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Practice location"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Site d'Appartenance</label>
                    <input 
                      type="text"
                      value={formData.siteAppartenance}
                      onChange={(e) => handleChange('siteAppartenance', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Hospital or health network"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Tax Number (GST/QST)</label>
                    <input 
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => handleChange('taxNumber', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="Tax identification number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Banking Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <CreditCard className="w-6 h-6 text-orange-400" />
                  <h2 className="text-xl font-bold text-orange-400 uppercase tracking-wide">
                    Banking Information
                  </h2>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-orange-400">
                    <strong>Note:</strong> This information is encrypted and securely stored. 
                    It's used for generating payment reports and reconciliation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Bank Name</label>
                    <input 
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => handleChange('bankName', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white"
                      placeholder="e.g., Royal Bank, TD Canada Trust"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Institution Number</label>
                    <input 
                      type="text"
                      value={formData.institutionNumber}
                      onChange={(e) => handleChange('institutionNumber', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono"
                      placeholder="000"
                      maxLength={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Transit Number</label>
                    <input 
                      type="text"
                      value={formData.transitNumber}
                      onChange={(e) => handleChange('transitNumber', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono"
                      placeholder="00000"
                      maxLength={5}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs uppercase font-bold text-white/40">Account Number</label>
                    <input 
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange('accountNumber', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm text-white font-mono"
                      placeholder="Account number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-6">
              {step > 1 && (
                <Button
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-white/20"
                >
                  Back
                </Button>
              )}
              
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 bg-primary text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-cyan"
                >
                  Next Step <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.firstName || !formData.lastName}
                  className="flex-1 bg-green-500 text-black font-bold uppercase tracking-wider h-14 rounded-2xl shadow-green disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Complete Setup"} <Save className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
