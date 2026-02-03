"use client";
import React, { useState } from "react";
import { Camera, RefreshCcw, CheckCircle2, AlertCircle, ArrowRight, CreditCard, Receipt, IdCard, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────

type DocType = "RAMQ_CARD" | "INSURANCE_CARD" | "ID_CARD" | "RECEIPT" | "INVOICE" | "UNKNOWN";
type BillingRec = "RAMQ" | "PRIVATE_INSURANCE" | "OUT_OF_PROVINCE" | "EXPENSE" | null;
type BillingTarget = "client" | "insurer";

interface ScanFields {
  fullName?: string | null;
  memberId?: string | null;
  dateOfBirth?: string | null;
  expiryDate?: string | null;
  province?: string | null;
  insurerName?: string | null;
  groupNumber?: string | null;
  policyNumber?: string | null;
  vendor?: string | null;
  amount?: number | null;
  date?: string | null;
  description?: string | null;
}

interface ScanResult {
  documentType: DocType;
  confidence: number;
  fields: ScanFields;
  billingRecommendation: BillingRec;
  detectedInsurer: string | null;
  detectedProvince: string | null;
}

export interface SmartScanCardData {
  fullName: string;
  memberId: string;
  dob?: string;
  insurer?: string;
  province?: string;
  billingRecommendation?: BillingRec;
  billingTarget?: BillingTarget;
}

export interface SmartScanExpenseData {
  vendor: string;
  amount: number;
  date: string;
  description: string;
}

interface SmartScannerProps {
  /** Embedded in invoice form — called when a card is scanned */
  onCardData?: (data: SmartScanCardData) => void;
  /** Embedded in expense form — called when a receipt is scanned */
  onExpenseData?: (data: SmartScanExpenseData) => void;
  /** Standalone mode — component handles navigation itself */
  standalone?: boolean;
}

// ── Badge config ───────────────────────────────────────────────────────────

const BADGE: Record<DocType, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
  RAMQ_CARD:      { label: "Carte RAMQ",          color: "border-primary bg-primary/10 text-primary",         glow: "shadow-[0_0_20px_rgba(0,217,255,0.3)]",  icon: <Shield className="w-3.5 h-3.5" /> },
  INSURANCE_CARD: { label: "Carte d'assurance",   color: "border-amber-400 bg-amber-500/10 text-amber-300",   glow: "shadow-[0_0_20px_rgba(251,191,36,0.3)]", icon: <CreditCard className="w-3.5 h-3.5" /> },
  ID_CARD:        { label: "Carte d'identité",    color: "border-blue-400 bg-blue-500/10 text-blue-300",      glow: "shadow-[0_0_20px_rgba(96,165,250,0.3)]", icon: <IdCard className="w-3.5 h-3.5" /> },
  RECEIPT:        { label: "Reçu / Dépense",      color: "border-green-400 bg-green-500/10 text-green-300",   glow: "shadow-[0_0_20px_rgba(74,222,128,0.3)]", icon: <Receipt className="w-3.5 h-3.5" /> },
  INVOICE:        { label: "Facture",             color: "border-green-400 bg-green-500/10 text-green-300",   glow: "shadow-[0_0_20px_rgba(74,222,128,0.3)]", icon: <Receipt className="w-3.5 h-3.5" /> },
  UNKNOWN:        { label: "Non reconnu",         color: "border-white/20 bg-white/5 text-white/40",          glow: "",                                       icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

// ── Field row ──────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] uppercase font-bold text-white/30 tracking-wide">{label}</span>
      <span className="text-xs text-white/80 font-mono">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SmartScanner({ onCardData, onExpenseData, standalone = false }: SmartScannerProps) {
  const router = useRouter();
  const [scanning, setScanning]       = useState(false);
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [billingTarget, setBillingTarget] = useState<BillingTarget>("client");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setScanning(true);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await fetch("/api/ocr/smart-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: reader.result }),
        });
        const data: ScanResult = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Scan failed");
        setResult(data);
        // Default billing target for insurance cards
        if (data.documentType === "INSURANCE_CARD") setBillingTarget("client");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan échoué");
      } finally {
        setScanning(false);
      }
    };
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  function handleContinue() {
    if (!result) return;
    const { documentType, fields, billingRecommendation, detectedInsurer, detectedProvince } = result;

    const isCard = ["RAMQ_CARD", "INSURANCE_CARD", "ID_CARD"].includes(documentType);
    const isExpense = ["RECEIPT", "INVOICE"].includes(documentType);

    const cardData: SmartScanCardData = {
      fullName: fields.fullName ?? "",
      memberId: fields.memberId ?? "",
      dob: fields.dateOfBirth ?? undefined,
      insurer: detectedInsurer ?? fields.insurerName ?? undefined,
      province: detectedProvince ?? fields.province ?? undefined,
      billingRecommendation,
      billingTarget: documentType === "INSURANCE_CARD" ? billingTarget : undefined,
    };

    const expenseData: SmartScanExpenseData = {
      vendor: fields.vendor ?? detectedInsurer ?? "",
      amount: fields.amount ?? 0,
      date: fields.date ?? new Date().toISOString().split("T")[0],
      description: fields.description ?? "",
    };

    if (standalone) {
      if (isCard) {
        sessionStorage.setItem("smartscan_card", JSON.stringify(cardData));
        router.push("/dashboard/invoice/new?from=scan");
      } else if (isExpense) {
        sessionStorage.setItem("smartscan_expense", JSON.stringify(expenseData));
        router.push("/dashboard/expenses/upload?from=scan");
      }
      return;
    }

    if (isCard && onCardData) onCardData(cardData);
    if (isExpense && onExpenseData) onExpenseData(expenseData);
  }

  const badge = result ? BADGE[result.documentType] : null;
  const isInsuranceCard = result?.documentType === "INSURANCE_CARD";
  const isExpense = result && ["RECEIPT", "INVOICE"].includes(result.documentType);
  const isUnknown = result?.documentType === "UNKNOWN";
  const hasAction = result && !isUnknown && (onCardData || onExpenseData || standalone);

  return (
    <div className="card-medical p-6 border-l-4 border-primary space-y-4">

      {/* Upload zone */}
      <div className="relative">
        <div className={`relative group border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${scanning ? "border-primary/60 bg-primary/5" : "border-white/10 hover:border-primary/40"}
          ${result && !isUnknown ? `${badge?.glow} border-solid ${badge?.color.split(" ")[0]}` : ""}
        `}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            disabled={scanning}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          {scanning ? (
            <div className="space-y-3">
              {/* Scan line animation */}
              <div className="relative mx-auto w-16 h-16">
                <div className="w-16 h-16 border-2 border-primary/30 rounded-xl" />
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary animate-[scan_1.5s_ease-in-out_infinite]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
                Analyse en cours…
              </p>
            </div>
          ) : result ? (
            <div className="space-y-3 text-left">
              {/* Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${badge?.color} ${badge?.glow}`}>
                  {badge?.icon}
                  {badge?.label}
                </span>
                <span className="text-[10px] text-white/30">{result.confidence}% confiance</span>
              </div>

              {/* Detected province */}
              {result.detectedProvince && (
                <div className="text-[10px] text-white/40 font-mono">
                  Province : <span className="text-white/70 font-bold">{result.detectedProvince}</span>
                  {result.billingRecommendation === "RAMQ" && <span className="ml-2 text-primary font-bold">→ RAMQ</span>}
                  {result.billingRecommendation === "OUT_OF_PROVINCE" && <span className="ml-2 text-amber-400 font-bold">→ Hors province</span>}
                </div>
              )}

              {/* Extracted fields */}
              <div className="bg-black/40 rounded-xl p-3 space-y-0.5">
                <Field label="Nom"          value={result.fields.fullName} />
                <Field label="No. membre"   value={result.fields.memberId} />
                <Field label="Naissance"    value={result.fields.dateOfBirth} />
                <Field label="Expiration"   value={result.fields.expiryDate} />
                <Field label="Assureur"     value={result.detectedInsurer ?? result.fields.insurerName} />
                <Field label="No. groupe"   value={result.fields.groupNumber} />
                <Field label="No. police"   value={result.fields.policyNumber} />
                <Field label="Fournisseur"  value={result.fields.vendor} />
                <Field label="Montant"      value={result.fields.amount != null ? `$${result.fields.amount}` : null} />
                <Field label="Date"         value={result.fields.date} />
                <Field label="Description"  value={result.fields.description} />
              </div>

              {/* Insurance billing choice */}
              {isInsuranceCard && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Facturer :</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingTarget("client")}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        billingTarget === "client"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      👤 Client (remboursement)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingTarget("insurer")}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        billingTarget === "insurer"
                          ? "border-amber-400 bg-amber-500/10 text-amber-300"
                          : "border-white/10 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      🏢 Assureur direct
                    </button>
                  </div>
                  <p className="text-[10px] text-white/25 leading-relaxed">
                    {billingTarget === "client"
                      ? "La facture est envoyée au client avec une copie de réclamation pour son assureur."
                      : "La réclamation est envoyée directement à l'assureur. Le client n'est pas facturé."}
                  </p>
                </div>
              )}

              {/* Out of province note */}
              {result.billingRecommendation === "OUT_OF_PROVINCE" && (
                <p className="text-[10px] text-amber-400/70 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  Patient hors Québec — sélectionnez le mode de facturation approprié dans le formulaire.
                </p>
              )}
            </div>
          ) : error ? (
            <div className="space-y-2">
              <AlertCircle className="mx-auto w-10 h-10 text-red-400" />
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          ) : (
            <div className="space-y-3 pointer-events-none">
              <Camera className="mx-auto w-12 h-12 text-white/15 group-hover:text-primary/40 transition-colors" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/30">
                Scanner un document
              </p>
              <p className="text-[10px] text-white/20 leading-relaxed">
                Carte RAMQ · Assurance · Carte d&apos;identité · Reçu
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      {(result || error) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-white/40 border border-white/10 hover:bg-white/5"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Rescanner
          </Button>

          {hasAction && (
            <Button
              type="button"
              onClick={handleContinue}
              className={`flex-1 gap-2 font-bold text-xs rounded-xl
                ${isExpense
                  ? "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
                  : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isExpense
                ? (standalone ? "Aller aux dépenses →" : "Remplir dépense")
                : (standalone ? "Aller à la facture →" : "Remplir formulaire")}
              {standalone && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; opacity: 1; }
          50% { top: calc(100% - 2px); opacity: 0.6; }
          100% { top: 0; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
