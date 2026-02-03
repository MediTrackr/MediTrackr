"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Eye, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { validateRAMQClaim } from "@/utils/ramq-adjudicator";
import { ProfessionalCategory } from "@/utils/ramq-categories";

interface RAMQClaim {
  id: string;
  patient_name: string;
  patient_ramq: string;
  patient_dob?: string;
  total_claimed: number;
  amount_received?: number;
  service_date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  act_codes?: Array<{code: string; description: string; fee: number; quantity: number}>;
  claim_number?: string;
  rejection_reason?: string;
  submitted_at?: string;
  created_at: string;
  doctor_ramq?: string;
  location_code?: string;
  diagnostic_code?: string;
  professional_category?: ProfessionalCategory;
}

export default function ViewRAMQClaimsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [claims, setClaims] = useState<RAMQClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from('ramq_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('service_date', { ascending: false });
      if (data) {
        setClaims(data as RAMQClaim[]);
        const claimed = data.reduce((sum, claim) => sum + (claim.total_claimed || 0), 0);
        const received = data.reduce((sum, claim) => sum + (claim.amount_received || 0), 0);
        setTotalClaimed(claimed);
        setTotalReceived(received);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitClaim = async (claim: RAMQClaim) => {
    const validation = validateRAMQClaim(claim.act_codes || [], [], {
      serviceDate: claim.service_date,
      doctorRamq: claim.doctor_ramq,
      locationCode: claim.location_code,
      patientDob: claim.patient_dob,
      diagnosticCode: claim.diagnostic_code,
      professionalCategory: claim.professional_category,
    });

    if (!validation.isValid) {
      alert(`Validation échouée — Facture NON RECEVABLE :\n\n${validation.errors.join('\n')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      const proceed = window.confirm(
        `Avertissements :\n\n${validation.warnings.join('\n')}\n\nContinuer la soumission ?`
      );
      if (!proceed) return;
    }

    try {
      const { error } = await supabase
        .from('ramq_claims')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', claim.id);

      if (error) throw error;
      fetchClaims();
      alert('Réclamation soumise à la RAMQ — statut : EN TRAITEMENT');
    } catch (error) {
      console.error('Error:', error);
      alert('Échec de la soumission');
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'approved': return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'submitted': return <Clock className="w-5 h-5 text-blue-400" />;
      default: return <FileText className="w-5 h-5 text-white/40" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'approved': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'submitted': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative border-[3px] border-black outline outline-2 outline-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">
        
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5 text-primary">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Réclamations RAMQ</h1>
          <div className="flex gap-3">
            <Link href="/dashboard/invoice/new">
              <Button className="gap-2 bg-primary text-black rounded-xl px-4 h-10 font-bold hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Nouvelle réclamation
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-medical p-6 border-l-4 border-primary bg-primary/5">
                <p className="text-[9px] uppercase font-bold text-primary/60 mb-2">Total réclamé</p>
                <p className="text-4xl font-bold text-primary">${totalClaimed.toFixed(2)}</p>
              </div>
              <div className="card-medical p-6 border-l-4 border-green-400 bg-green-500/5">
                <p className="text-[9px] uppercase font-bold text-green-400/60 mb-2">Total reçu</p>
                <p className="text-4xl font-bold text-green-400">${totalReceived.toFixed(2)}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-white/40 py-12">Chargement...</div>
            ) : claims.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">Aucune réclamation RAMQ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div key={claim.id} className="card-medical p-6 border-l-4 border-primary/50 hover:border-primary transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(claim.status)}
                          <h3 className="text-lg font-bold text-white">{claim.patient_name}</h3>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(claim.status)}`}>
                            {{ draft: "BROUILLON", submitted: "SOUMIS", approved: "APPROUVÉ", rejected: "REJETÉ", paid: "PAYÉ" }[claim.status] ?? (claim.status?.toUpperCase() || "BROUILLON")}
                          </span>
                        </div>
                        <p className="text-sm text-white/60">RAMQ: {claim.patient_ramq}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">${claim.total_claimed?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-white/40">{claim.service_date}</p>
                      </div>
                    </div>
                    
                    {claim.act_codes && Array.isArray(claim.act_codes) && claim.act_codes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {claim.act_codes.map((act, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded text-white/60">
                            {act.code} - ${act.fee?.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Link href={`/claims/ramq/${claim.id}`}>
                        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                          <Eye className="w-4 h-4 mr-2" /> Fiche FacturActe
                        </Button>
                      </Link>
                      {claim.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-green-400 hover:bg-green-500/10"
                          onClick={() => handleSubmitClaim(claim)}
                        >
                          <FileText className="w-4 h-4 mr-2" /> Soumettre à la RAMQ
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
