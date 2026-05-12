"use client";

/**
 * Reusable RAMQ claim validation panel.
 * Shows errors, warnings, and info notices with RAMQ codes and fix suggestions.
 * Used in: claim detail page, command center expanded row, pre-submission modal.
 */

import React, { useState } from "react";
import { AlertTriangle, XCircle, Info, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { ValidationResult, ValidationIssue } from "@/utils/ramq-adjudicator";

interface ValidationPanelProps {
  result:      ValidationResult;
  compact?:    boolean;   // show only summary line (for list views)
  className?:  string;
}

const SEVERITY_CONFIG = {
  error: {
    icon:       <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />,
    badgeClass: 'bg-red-500/10 border-red-500/20 text-red-400',
    rowClass:   'bg-red-500/5 border-red-500/15',
    label:      'Erreur',
  },
  warning: {
    icon:       <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-400" />,
    badgeClass: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    rowClass:   'bg-yellow-500/5 border-yellow-500/15',
    label:      'Avertissement',
  },
  info: {
    icon:       <Info className="w-4 h-4 flex-shrink-0 text-blue-400" />,
    badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    rowClass:   'bg-blue-500/5 border-blue-500/15',
    label:      'Info',
  },
} as const;

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const hasMeta = issue.suggestion || issue.ruleRef;

  return (
    <div className={`rounded-xl border px-4 py-3 ${cfg.rowClass}`}>
      <div
        className="flex items-start gap-3 cursor-pointer select-none"
        onClick={() => hasMeta && setOpen(o => !o)}
      >
        {cfg.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-white/25">{issue.code}</span>
            {issue.field && (
              <span className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/30 font-mono">
                {issue.field}
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 mt-0.5 leading-snug">{issue.message}</p>
        </div>
        {hasMeta && (
          <button className="text-white/20 hover:text-white/50 flex-shrink-0 mt-0.5">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {open && hasMeta && (
        <div className="mt-2 ml-7 space-y-1">
          {issue.suggestion && (
            <p className="text-[11px] text-white/50">
              <span className="text-white/30 font-semibold">→ </span>{issue.suggestion}
            </p>
          )}
          {issue.ruleRef && (
            <p className="text-[10px] text-white/25 font-mono">Réf : {issue.ruleRef}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ValidationPanel({ result, compact = false, className = '' }: ValidationPanelProps) {
  const errorCount   = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const infoCount    = result.issues.filter(i => i.severity === 'info').length;
  const [expanded, setExpanded] = useState(!compact);

  if (result.issues.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20 ${className}`}>
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-sm text-green-400 font-medium">Prête pour soumission — aucun problème détecté</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${result.isValid ? 'border-yellow-500/20' : 'border-red-500/20'} bg-black/30 ${className}`}>
      {/* Summary header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(o => !o)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {errorCount > 0 && (
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${SEVERITY_CONFIG.error.badgeClass}`}>
              <XCircle className="w-3 h-3" /> {errorCount} erreur{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${SEVERITY_CONFIG.warning.badgeClass}`}>
              <AlertTriangle className="w-3 h-3" /> {warningCount} avertissement{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${SEVERITY_CONFIG.info.badgeClass}`}>
              <Info className="w-3 h-3" /> {infoCount} info
            </span>
          )}
          {!result.isValid && (
            <span className="text-[10px] text-red-400/60 font-medium">— Correction requise avant soumission</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
      </button>

      {/* Issue list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {(['error', 'warning', 'info'] as const).map(sev =>
            result.issues
              .filter(i => i.severity === sev)
              .map((issue, idx) => <IssueRow key={`${sev}-${idx}`} issue={issue} />)
          )}
        </div>
      )}
    </div>
  );
}

/** Compact inline badge for list views — just shows counts. */
export function ValidationBadge({
  errorCount,
  warningCount,
}: {
  errorCount: number;
  warningCount: number;
}) {
  if (errorCount === 0 && warningCount === 0) return null;
  return (
    <span className="flex items-center gap-1">
      {errorCount > 0 && (
        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <XCircle className="w-2.5 h-2.5" /> {errorCount}
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
          <AlertTriangle className="w-2.5 h-2.5" /> {warningCount}
        </span>
      )}
    </span>
  );
}

export default ValidationPanel;
