"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X, Eye } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DiscrepancyItem {
  id: string;
  claimId: string;
  claimType: "ramq" | "federal" | "out_province" | "diplomatic" | "invoice";
  severity: "critical" | "warning" | "info";
  code: string; // e.g. DUPLICATE, STALE_DRAFT, AMOUNT_MISMATCH, MISSING_FIELD
  message: string;
  resolveUrl?: string; // link to the claim / edit page
}

interface DiscrepancyAlertProps {
  /** Raw claim rows fetched on the dashboard (all types merged). */
  claims: RawClaim[];
  /** If true the banner stays hidden after the user dismisses it this session. */
  dismissible?: boolean;
}

/** Minimal shape we need from any claim row. */
interface RawClaim {
  id: string;
  status: string;
  total_claimed: number;
  service_date: string;
  patient_name?: string;
  patient_ramq?: string;
  patient_federal_id?: string;
  act_codes?: { code: string; fee: number }[];
  service_codes?: { code: string; fee: number }[];
  // tag injected by the dashboard fetch so we know which table it came from
  _claimType: "ramq" | "federal" | "out_province" | "diplomatic";
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------
const STALE_DRAFT_DAYS = 14; // drafts older than this are flagged

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function detectDiscrepancies(claims: RawClaim[]): DiscrepancyItem[] {
  const alerts: DiscrepancyItem[] = [];
  const seen = new Map<string, RawClaim>(); // key = dedup fingerprint

  claims.forEach((claim) => {
    const codes = claim.act_codes || claim.service_codes || [];
    const claimType = claim._claimType;
    const editBase =
      claimType === "ramq"
        ? "/claims/ramq"
        : claimType === "federal"
        ? "/claims/federal"
        : claimType === "out_province"
        ? "/claims/out-of-province"
        : "/claims/diplomatic";

    // 1 — STALE DRAFT
    if (claim.status === "draft" && daysSince(claim.service_date) > STALE_DRAFT_DAYS) {
      alerts.push({
        id: `stale-${claim.id}`,
        claimId: claim.id,
        claimType,
        severity: "warning",
        code: "STALE_DRAFT",
        message: `Draft ${claimType.replace("_", " ")} claim for "${claim.patient_name || "Unknown"}" has been sitting for ${daysSince(claim.service_date)} days.`,
        resolveUrl: `${editBase}/${claim.id}`,
      });
    }

    // 2 — DUPLICATE (same patient + service_date + codes)
    const dedupKey = [
      claim.patient_name?.toLowerCase().trim(),
      claim.patient_ramq || claim.patient_federal_id || "",
      claim.service_date,
      codes.map((c) => c.code).sort().join(","),
    ].join("|");

    if (seen.has(dedupKey)) {
      // Only push once per pair
      const other = seen.get(dedupKey)!;
      alerts.push({
        id: `dup-${claim.id}-${other.id}`,
        claimId: claim.id,
        claimType,
        severity: "critical",
        code: "DUPLICATE",
        message: `Possible duplicate ${claimType.replace("_", " ")} claim for "${claim.patient_name || "Unknown"}" on ${claim.service_date}.`,
        resolveUrl: editBase,
      });
    } else {
      seen.set(dedupKey, claim);
    }

    // 3 — AMOUNT MISMATCH (sum of line fees ≠ total_claimed)
    if (codes.length > 0) {
      const lineSum = codes.reduce((s, c) => s + (c.fee || 0), 0);
      if (Math.abs(lineSum - claim.total_claimed) > 0.01 && claim.total_claimed > 0) {
        alerts.push({
          id: `mismatch-${claim.id}`,
          claimId: claim.id,
          claimType,
          severity: "warning",
          code: "AMOUNT_MISMATCH",
          message: `Line-item total ($${lineSum.toFixed(2)}) doesn't match claimed amount ($${claim.total_claimed.toFixed(2)}).`,
          resolveUrl: `${editBase}/${claim.id}`,
        });
      }
    }

    // 4 — MISSING REQUIRED FIELD
    if (claimType === "ramq" && !claim.patient_ramq) {
      alerts.push({
        id: `missing-${claim.id}-ramq`,
        claimId: claim.id,
        claimType,
        severity: "critical",
        code: "MISSING_FIELD",
        message: `RAMQ claim for "${claim.patient_name || "Unknown"}" is missing the RAMQ number.`,
        resolveUrl: `${editBase}/${claim.id}`,
      });
    }
    if (claimType === "federal" && !claim.patient_federal_id) {
      alerts.push({
        id: `missing-${claim.id}-fed`,
        claimId: claim.id,
        claimType,
        severity: "critical",
        code: "MISSING_FIELD",
        message: `Federal claim for "${claim.patient_name || "Unknown"}" is missing the Federal / Service ID.`,
        resolveUrl: `${editBase}/${claim.id}`,
      });
    }
  });

  return alerts;
}

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------
const SEVERITY_STYLES = {
  critical: {
    dot: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    label: "Critical",
  },
  warning: {
    dot: "bg-orange-400",
    text: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/8",
    label: "Warning",
  },
  info: {
    dot: "bg-primary",
    text: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/8",
    label: "Info",
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DiscrepancyAlert({ claims, dismissible = true }: DiscrepancyAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [alerts, setAlerts] = useState<DiscrepancyItem[]>([]);

  useEffect(() => {
    const detected = detectDiscrepancies(claims);
    setAlerts(detected);
    // Auto-expand if there are critical items
    if (detected.some((a) => a.severity === "critical")) {
      setExpanded(true);
    }
  }, [claims]);

  if (dismissed || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="card-medical border-l-4 border-orange-400 overflow-hidden">
      {/* ── Header row ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-orange-400 flex-shrink-0" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
            Discrepancy Alert
          </span>
          {/* pill badges */}
          <div className="flex items-center gap-1.5 ml-1">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/12 border border-red-500/25 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/12 border border-orange-500/25 text-[9px] font-bold text-orange-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {warningCount} Warning
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
          {dismissible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              className="p-0.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Collapsible body ── */}
      {expanded && (
        <div className="border-t border-white/8 divide-y divide-white/6">
          {alerts.map((alert) => {
            const s = SEVERITY_STYLES[alert.severity];
            return (
              <div
                key={alert.id}
                className={`flex items-start justify-between gap-4 px-5 py-3 ${s.bg} transition-colors`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* severity dot */}
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <div className="min-w-0">
                    {/* code tag + message */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${s.border} ${s.text}`}
                      >
                        {alert.code.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>

                {/* resolve link */}
                {alert.resolveUrl && (
                  <Link
                    href={alert.resolveUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-wider px-2.5 py-1 rounded-lg border border-primary/20 bg-black/40 hover:bg-primary/10 hover:border-primary/40 transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-3 h-3" /> Review
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
