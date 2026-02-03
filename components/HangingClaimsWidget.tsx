"use client";
import React, { useState } from "react";
import { Clock, ExternalLink, ChevronDown, ChevronUp, AlertOctagon } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface HangingClaim {
  id: string;
  claim_type: "ramq" | "federal" | "out_province" | "diplomatic";
  patient_name: string;
  status: string;
  total_claimed: number;
  service_date: string;
  days_outstanding: number;
  payer_type?: string; // federal sub-type
  province_code?: string; // OOP
  country_code?: string; // diplomatic
}

interface HangingClaimsWidgetProps {
  claims: HangingClaim[];
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TYPE_META = {
  ramq: {
    label: "RAMQ",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
    route: "/claims/ramq",
  },
  federal: {
    label: "Federal",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/8",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    route: "/claims/federal",
  },
  out_province: {
    label: "Out-of-Province",
    color: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/8",
    glow: "shadow-[0_0_12px_rgba(74,222,128,0.15)]",
    route: "/claims/out-of-province",
  },
  diplomatic: {
    label: "Diplomatic",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/8",
    glow: "shadow-[0_0_12px_rgba(167,139,250,0.15)]",
    route: "/claims/diplomatic",
  },
} as const;

/** Urgency thresholds in days → tailwind classes */
function urgencyClasses(days: number) {
  if (days >= 90)
    return { bar: "bg-red-500", text: "text-red-400", pulse: true };
  if (days >= 60)
    return { bar: "bg-orange-400", text: "text-orange-400", pulse: false };
  return { bar: "bg-yellow-400", text: "text-yellow-400", pulse: false };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HangingClaimsWidget({ claims, loading = false }: HangingClaimsWidgetProps) {
  const [expanded, setExpanded] = useState(true);

  // Group by claim_type, preserving order of first appearance
  const grouped = claims.reduce<Record<string, HangingClaim[]>>((acc, c) => {
    (acc[c.claim_type] ??= []).push(c);
    return acc;
  }, {});

  // Aggregate totals for the header badges
  const totalAmount = claims.reduce((s, c) => s + c.total_claimed, 0);
  const maxDays = claims.length ? Math.max(...claims.map((c) => c.days_outstanding)) : 0;

  // Nothing to show
  if (!loading && claims.length === 0) return null;

  return (
    <div className="card-medical border-l-4 border-red-500 overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <AlertOctagon className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
            Hanging Claims
          </span>

          {/* summary pills */}
          {!loading && claims.length > 0 && (
            <div className="flex items-center gap-2 ml-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/12 border border-red-500/25 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {claims.length} Claim{claims.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-white/50 uppercase tracking-wider">
                ${totalAmount.toLocaleString("en-CA", { minimumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {expanded && (
        <div className="border-t border-white/8">
          {/* loading skeleton */}
          {loading && (
            <div className="px-5 py-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-white/4 animate-pulse" />
              ))}
            </div>
          )}

          {/* empty after load */}
          {!loading && claims.length === 0 && (
            <p className="text-xs text-white/30 text-center py-6">No hanging claims.</p>
          )}

          {/* grouped rows */}
          {!loading &&
            Object.entries(grouped).map(([type, group]) => {
              const meta = TYPE_META[type as keyof typeof TYPE_META];
              const groupTotal = group.reduce((s, c) => s + c.total_claimed, 0);

              return (
                <div key={type} className="border-b border-white/6 last:border-b-0">
                  {/* sub-header */}
                  <div className="flex items-center justify-between px-5 py-2.5 bg-white/3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.color.replace("text-", "bg-")}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-white/25 font-bold">
                        ({group.length})
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-white/40">
                      ${groupTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* claim rows */}
                  {group.map((claim) => {
                    const u = urgencyClasses(claim.days_outstanding);

                    return (
                      <div
                        key={claim.id}
                        className={`flex items-center gap-4 px-5 py-3 ${meta.bg} hover:brightness-125 transition-all group`}
                      >
                        {/* urgency bar */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-8">
                          <div
                            className={`w-1 rounded-full ${u.bar} ${u.pulse ? "animate-pulse" : ""}`}
                            style={{ height: `${Math.min(claim.days_outstanding * 0.4, 32)}px` }}
                          />
                        </div>

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-white truncate">
                              {claim.patient_name}
                            </p>
                            <span
                              className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.border} ${meta.color}`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[9px] text-white/35">
                              Service: {claim.service_date}
                            </span>
                            {claim.province_code && (
                              <span className="text-[9px] text-white/35">{claim.province_code}</span>
                            )}
                            {claim.country_code && (
                              <span className="text-[9px] text-white/35">{claim.country_code}</span>
                            )}
                          </div>
                        </div>

                        {/* days outstanding badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Clock className={`w-3 h-3 ${u.text}`} />
                          <span className={`text-[9px] font-bold ${u.text}`}>
                            {claim.days_outstanding}d
                          </span>
                        </div>

                        {/* amount */}
                        <div className="flex-shrink-0 text-right w-20">
                          <p className="text-xs font-bold text-white">
                            ${claim.total_claimed.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* action link */}
                        <Link
                          href={`${meta.route}/${claim.id}`}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/30 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          {/* footer — link to full claims view */}
          {!loading && claims.length > 0 && (
            <div className="px-5 py-3 border-t border-white/8 flex justify-end">
              <Link
                href="/claims"
                className="text-[9px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 hover:text-primary/70 transition-colors"
              >
                View All Claims <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
