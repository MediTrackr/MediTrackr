import { ProfessionalCategory, isValidProviderNumberForCategory } from './ramq-categories';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActCode {
  code: string;
  fee: number;
  quantity: number;
  modifier?: string;
  contextElement?: string;
}

export interface ValidationIssue {
  severity:    'error' | 'warning' | 'info';
  code:        string;       // RAMQ rejection code or MT-XXX internal code
  message:     string;
  suggestion?: string;       // how to fix it
  field?:      string;       // which claim field is affected
  ruleRef?:    string;       // RAMQ guide section
}

export interface ValidationResult {
  isValid:   boolean;        // false = at least one error (claim should not be submitted)
  issues:    ValidationIssue[];
  // Legacy flat arrays for backward compatibility
  errors:    string[];
  warnings:  string[];
}

export interface ClaimContext {
  serviceDate?:          string;
  doctorRamq?:           string;
  locationCode?:         string;
  patientDob?:           string;
  patientRamq?:          string;
  diagnosticCode?:       string;
  professionalCategory?: ProfessionalCategory;
  startTime?:            string;
  endTime?:              string;
  role?:                 string;
  contextElements?:      string[];
  // For duplicate detection — pass in same-patient, same-date claims already in DB
  existingClaims?:       { id: string; status: string; act_codes?: ActCode[]; service_date?: string }[];
  claimId?:              string;   // current claim's own ID (exclude from dup check)
}

// ── Code rule tables ──────────────────────────────────────────────────────────

const PRISE_EN_CHARGE_CODES = new Set(['15825', '15826', '15829', '15830']);

// Codes restricted to specific professional categories
const CODE_CATEGORY_RESTRICTIONS: Record<string, ProfessionalCategory[]> = {
  // Prise en charge — omnipraticiens only
  '15825': ['omni'], '15826': ['omni'], '15829': ['omni'], '15830': ['omni'],
  // Obstétrique — omni + sage-femme
  '09200': ['omni', 'midwife'], '09201': ['omni', 'midwife'],
  '09210': ['omni', 'midwife'], '09211': ['omni', 'midwife'],
  // Acupuncture context codes — omni only (when billed as act)
  '19100': ['omni'], '19101': ['omni'], '19113': ['omni'],
};

// Code prefixes restricted by category
const PREFIX_CATEGORY_RESTRICTIONS: { prefix: string; categories: ProfessionalCategory[]; label: string }[] = [
  { prefix: '092', categories: ['omni', 'midwife'],            label: 'obstétrique' },
  { prefix: '093', categories: ['omni', 'midwife'],            label: 'obstétrique' },
  { prefix: '191', categories: ['omni'],                       label: 'acupuncture' },
  { prefix: '007', categories: ['specialist', 'omni'],         label: 'anesthésie' },
];

// Codes that require start_time + end_time
const CODES_REQUIRING_TIME = new Set([
  '00097', // examen complet majeur
  '09200', '09201', '09210', '09211', // accouchements
  '00620', '00621', // chirurgie
]);

// Code prefixes that require time fields
const PREFIX_REQUIRING_TIME = ['007', '006', '092', '093'];

// Codes that require a context element
const CODES_REQUIRING_CONTEXT: Record<string, string> = {
  '19100': 'Acupuncture — le nombre de sites doit être indiqué comme élément de contexte.',
  '19101': 'Acupuncture — le nombre de sites doit être indiqué comme élément de contexte.',
  '15825': 'Prise en charge — le rôle du médecin doit être précisé.',
  '15826': 'Prise en charge — le rôle du médecin doit être précisé.',
};

// Incompatible code pairs (cannot appear on the same claim)
const INCOMPATIBLE_PAIRS: [string, string, string][] = [
  ['15825', '15826', 'Deux types de prise en charge ne peuvent être facturés ensemble.'],
  ['15829', '15830', 'Deux types de prise en charge ne peuvent être facturés ensemble.'],
  ['00097', '00090', "L'examen complet majeur (00097) ne peut être facturé avec une visite courte le même jour."],
  ['00097', '00091', "L'examen complet majeur (00097) ne peut être facturé avec une visite longue le même jour."],
];

// Codes with an annual limit per patient (key = code, value = max per year)
const ANNUAL_LIMIT_CODES: Record<string, number> = {
  '00097': 1, // examen complet majeur — 1 par an
  '15825': 1, // prise en charge de base
  '15826': 1, // prise en charge vulnérable
};

// ── RAMQ number structural validator ─────────────────────────────────────────

function validateRAMQNumber(ramqNumber: string, patientDob?: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const clean = ramqNumber.replace(/[\s-]/g, '').toUpperCase();

  if (!/^[A-Z]{4}\d{8}$/.test(clean)) {
    issues.push({
      severity:   'error',
      code:       'MT-RAMQ-001',
      message:    `Format de numéro RAMQ invalide (${ramqNumber}). Format attendu : LLLL NNNN NNNN (4 lettres + 8 chiffres).`,
      suggestion: "Vérifiez le numéro sur la carte d'assurance maladie du patient.",
      field:      'patient_ramq',
    });
    return issues; // no further checks possible
  }

  if (patientDob) {
    try {
      const dob        = new Date(patientDob);
      const yearLast2  = dob.getFullYear() % 100;
      const birthMonth = dob.getMonth() + 1;
      const birthDay   = dob.getDate();

      const ramqYear  = parseInt(clean.slice(4, 6), 10);
      const ramqMonth = parseInt(clean.slice(6, 8), 10);
      const ramqDay   = parseInt(clean.slice(8, 10), 10);

      if (ramqYear !== yearLast2) {
        issues.push({
          severity:   'error',
          code:       'MT-RAMQ-002',
          message:    `L'année dans le numéro RAMQ (${ramqYear < 10 ? '0' + ramqYear : ramqYear}) ne correspond pas à la date de naissance (${yearLast2 < 10 ? '0' + yearLast2 : yearLast2}).`,
          suggestion: 'Vérifiez la date de naissance ou le numéro RAMQ.',
          field:      'patient_ramq',
        });
      }

      // Female encoding: month + 50 (janvier = 51 ... décembre = 62)
      const isFemaleEncoded = ramqMonth >= 51 && ramqMonth <= 62;
      const decodedMonth    = isFemaleEncoded ? ramqMonth - 50 : ramqMonth;

      if (decodedMonth !== birthMonth) {
        issues.push({
          severity:   'error',
          code:       'MT-RAMQ-003',
          message:    `Le mois dans le numéro RAMQ (${ramqMonth}) ne correspond pas à la date de naissance (mois ${birthMonth}${birthMonth !== decodedMonth ? ` — pour femmes le mois est encodé +50` : ''}).`,
          suggestion: 'Pour les femmes, le mois dans le numéro RAMQ est le mois calendaire + 50.',
          field:      'patient_ramq',
        });
      }

      if (ramqDay !== birthDay) {
        issues.push({
          severity:   'error',
          code:       'MT-RAMQ-004',
          message:    `Le jour dans le numéro RAMQ (${ramqDay}) ne correspond pas à la date de naissance (jour ${birthDay}).`,
          suggestion: 'Vérifiez la date de naissance ou le numéro RAMQ.',
          field:      'patient_ramq',
        });
      }
    } catch {
      // Invalid date — skip cross-check
    }
  }

  return issues;
}

// ── Main validator ────────────────────────────────────────────────────────────

export const validateRAMQClaim = (
  actCodes: ActCode[],
  yearCodes: string[] = [],
  options: ClaimContext = {},
): ValidationResult => {
  const issues: ValidationIssue[] = [];
  const cat = options.professionalCategory;

  // ── 1. RAMQ number structure + DOB cross-check ────────────────────────────
  if (options.patientRamq) {
    issues.push(...validateRAMQNumber(options.patientRamq, options.patientDob));
  } else {
    issues.push({
      severity:   'error',
      code:       'MT-RAMQ-010',
      message:    'Numéro d\'assurance maladie (RAMQ) du patient manquant.',
      suggestion: 'Le numéro RAMQ est obligatoire pour toute réclamation.',
      field:      'patient_ramq',
    });
  }

  // ── 2. 90-day billing deadline (GuideOmni §1.2) ───────────────────────────
  if (options.serviceDate) {
    const svc      = new Date(options.serviceDate);
    const deadline = new Date(svc);
    deadline.setDate(deadline.getDate() + 90);
    const today    = new Date();

    if (today > deadline) {
      issues.push({
        severity:   'error',
        code:       'RAMQ-0005',
        message:    `Délai de facturation dépassé — services du ${options.serviceDate} devaient être soumis avant le ${deadline.toISOString().split('T')[0]}.`,
        suggestion: 'Une réclamation hors délai est automatiquement rejetée par la RAMQ (règle des 90 jours).',
        ruleRef:    'GuideOmni §1.2',
        field:      'service_date',
      });
    } else {
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
      if (daysLeft <= 10) {
        issues.push({
          severity:   'warning',
          code:       'MT-DL-001',
          message:    `Délai de 90 jours : il reste ${daysLeft} jour(s) pour soumettre.`,
          field:      'service_date',
        });
      }
    }
  }

  // ── 3. Provider number — format + category match ──────────────────────────
  if (options.doctorRamq) {
    const num = options.doctorRamq.replace(/\s/g, '');
    if (cat) {
      if (!isValidProviderNumberForCategory(num, cat)) {
        issues.push({
          severity:   'error',
          code:       'RAMQ-0003',
          message:    `Numéro de professionnel (${options.doctorRamq}) invalide pour la catégorie "${cat}".`,
          suggestion: 'Vérifiez le format attendu dans votre profil RAMQ.',
          field:      'doctor_ramq',
        });
      }
    } else if (!/^[15]\d{5}$/.test(num)) {
      issues.push({
        severity:   'error',
        code:       'RAMQ-0003',
        message:    `Numéro de médecin invalide (${options.doctorRamq}). Doit être 6 chiffres commençant par 1 ou 5.`,
        field:      'doctor_ramq',
      });
    }
  }

  // ── 4. Code × professional category compatibility ─────────────────────────
  if (cat && actCodes.length > 0) {
    for (const act of actCodes) {
      // Exact code restrictions
      const allowed = CODE_CATEGORY_RESTRICTIONS[act.code];
      if (allowed && !allowed.includes(cat)) {
        issues.push({
          severity:   'error',
          code:       'RAMQ-0003',
          message:    `Code ${act.code} non autorisé pour la catégorie "${cat}" — ce code est réservé à : ${allowed.join(', ')}.`,
          suggestion: 'Vérifiez le tarif RAMQ applicable à votre catégorie professionnelle.',
          field:      'act_codes',
        });
      }
      // Prefix restrictions
      for (const rule of PREFIX_CATEGORY_RESTRICTIONS) {
        if (act.code.startsWith(rule.prefix) && !rule.categories.includes(cat)) {
          issues.push({
            severity:   'error',
            code:       'RAMQ-0003',
            message:    `Code ${act.code} (${rule.label}) non autorisé pour la catégorie "${cat}".`,
            suggestion: `Les codes ${rule.prefix}xx sont réservés à : ${rule.categories.join(', ')}.`,
            field:      'act_codes',
          });
        }
      }
    }
  }

  // ── 5. Missing modifier / context element ─────────────────────────────────
  for (const act of actCodes) {
    if (CODES_REQUIRING_CONTEXT[act.code]) {
      const hasContext = options.contextElements && options.contextElements.length > 0;
      const hasModifier = act.modifier || act.contextElement;
      if (!hasContext && !hasModifier) {
        issues.push({
          severity:   'error',
          code:       'RAMQ-0006',
          message:    `Code ${act.code} — élément de contexte ou modificateur requis.`,
          suggestion: CODES_REQUIRING_CONTEXT[act.code],
          field:      'act_codes',
        });
      }
    }
  }

  // Prise en charge requires role to be set
  const hasPEC = actCodes.some(a => PRISE_EN_CHARGE_CODES.has(a.code));
  if (hasPEC && !options.role) {
    issues.push({
      severity:   'warning',
      code:       'MT-ROLE-001',
      message:    'Prise en charge (15825–15830) — le rôle du médecin (médecin responsable, consultant, etc.) doit être précisé.',
      suggestion: 'Ajoutez le rôle dans les détails de la réclamation.',
      field:      'role',
    });
  }

  // ── 6. Start/end time requirements ────────────────────────────────────────
  const needsTime = actCodes.some(act =>
    CODES_REQUIRING_TIME.has(act.code) ||
    PREFIX_REQUIRING_TIME.some(p => act.code.startsWith(p))
  );
  if (needsTime && (!options.startTime || !options.endTime)) {
    issues.push({
      severity:   'error',
      code:       'RAMQ-0008',
      message:    'Heures de début et de fin obligatoires pour les codes de chirurgie, obstétrique et anesthésie.',
      suggestion: 'Ajoutez l\'heure de début et de fin du service.',
      field:      'start_time',
      ruleRef:    'GuideOmni §4.3',
    });
  }

  // ── 7. Duplicate consultation codes ───────────────────────────────────────
  const consultations = actCodes.filter(a => a.code?.startsWith('001'));
  if (consultations.length > 1) {
    issues.push({
      severity:   'error',
      code:       'RAMQ-0007',
      message:    'Codes de consultation en double (001xx) pour la même date de service.',
      suggestion: 'Une seule consultation peut être facturée par date de service.',
      field:      'act_codes',
    });
  }

  // ── 8. Incompatible code pairs ────────────────────────────────────────────
  const claimCodeSet = new Set(actCodes.map(a => a.code));
  for (const [codeA, codeB, msg] of INCOMPATIBLE_PAIRS) {
    if (claimCodeSet.has(codeA) && claimCodeSet.has(codeB)) {
      issues.push({
        severity:   'error',
        code:       'RAMQ-0007',
        message:    `Codes incompatibles : ${codeA} + ${codeB}. ${msg}`,
        field:      'act_codes',
      });
    }
  }

  // ── 9. Prise en charge + examen complet annual conflict ───────────────────
  if (hasPEC && yearCodes.includes('00097')) {
    issues.push({
      severity:   'error',
      code:       'RAMQ-0007',
      message:    'Prise en charge (15825–15830) non facturable — un examen complet majeur (00097) a déjà été facturé pour ce patient cette année.',
      ruleRef:    'GuideOmni §9.1',
      field:      'act_codes',
    });
  }

  // Annual limit warning for codes already present in year history
  for (const [code, limit] of Object.entries(ANNUAL_LIMIT_CODES)) {
    const count = yearCodes.filter(c => c === code).length;
    if (count >= limit && claimCodeSet.has(code)) {
      issues.push({
        severity:   'error',
        code:       'MT-ANNUAL-001',
        message:    `Code ${code} a déjà été facturé ${count} fois cette année (limite : ${limit}/an pour ce patient).`,
        suggestion: 'Vérifiez l\'historique de facturation pour ce patient.',
        field:      'act_codes',
      });
    }
  }

  // ── 10. Duplicate submission detection ────────────────────────────────────
  if (options.existingClaims && options.serviceDate && actCodes.length > 0) {
    const sameDayClaims = options.existingClaims.filter(
      ec =>
        ec.id !== options.claimId &&
        ec.service_date === options.serviceDate &&
        !['draft', 'rejected'].includes(ec.status)
    );

    if (sameDayClaims.length > 0) {
      const existingCodes = sameDayClaims.flatMap(ec =>
        (ec.act_codes as ActCode[] | undefined)?.map(a => a.code) ?? []
      );
      const duplicateCodes = actCodes
        .map(a => a.code)
        .filter(c => existingCodes.includes(c));

      if (duplicateCodes.length > 0) {
        issues.push({
          severity:   'error',
          code:       'RAMQ-0001',
          message:    `Soumission en double — les codes ${duplicateCodes.join(', ')} ont déjà été soumis pour ce patient à la même date de service.`,
          suggestion: 'Vérifiez vos réclamations existantes pour éviter le rejet automatique pour double facturation.',
          field:      'act_codes',
          ruleRef:    'GuideOmni §1.3',
        });
      } else if (sameDayClaims.length > 0) {
        issues.push({
          severity:   'warning',
          code:       'MT-DUP-002',
          message:    `Une réclamation existe déjà pour ce patient à la date du ${options.serviceDate} (statut : ${sameDayClaims[0].status}). Vérifiez qu'il ne s'agit pas d'un doublon.`,
          field:      'service_date',
        });
      }
    }
  }

  // ── 11. Minimum fee ───────────────────────────────────────────────────────
  const total = actCodes.reduce((s, a) => s + (a.fee * a.quantity), 0);
  if (total <= 0) {
    issues.push({
      severity: 'error',
      code:     'MT-FEE-001',
      message:  'Le montant total réclamé doit être supérieur à 0 $.',
      field:    'act_codes',
    });
  }

  // ── 12. Diagnostic code ───────────────────────────────────────────────────
  if (!options.diagnosticCode) {
    issues.push({
      severity:   'warning',
      code:       'MT-DX-001',
      message:    "Code diagnostique (CIM-9/CIM-10) manquant — champ obligatoire dans FacturActe.",
      suggestion: "Ajoutez le code diagnostique principal lié à cette consultation.",
      field:      'diagnostic_code',
      ruleRef:    'FacturActe étape 1',
    });
  }

  // ── 13. Pediatric majoration ──────────────────────────────────────────────
  if (options.patientDob && options.serviceDate) {
    const dob      = new Date(options.patientDob);
    const svc      = new Date(options.serviceDate);
    const ageMonths =
      (svc.getFullYear() - dob.getFullYear()) * 12 +
      (svc.getMonth() - dob.getMonth());

    if (ageMonths < 24) {
      issues.push({
        severity:   'info',
        code:       'MT-PED-001',
        message:    `Patient de ${ageMonths} mois au moment du service (< 2 ans) — majoration pédiatrique applicable.`,
        suggestion: 'Vérifiez l\'application de la majoration +50 % (Annexe II).',
        ruleRef:    'GuideOmni Annexe II',
      });
    } else if (ageMonths < 60) {
      issues.push({
        severity:   'info',
        code:       'MT-PED-002',
        message:    `Patient de ${Math.floor(ageMonths / 12)} ans au moment du service (2–4 ans) — vérifiez les majorations pédiatriques applicables.`,
        ruleRef:    'GuideOmni Annexe II',
      });
    }
  }

  // ── Flatten to legacy arrays ──────────────────────────────────────────────
  const errors   = issues.filter(i => i.severity === 'error').map(i => i.message);
  const warnings = issues.filter(i => i.severity === 'warning').map(i => i.message);

  return {
    isValid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
};

// ── Standalone helpers ────────────────────────────────────────────────────────

export const isWithin90Days = (serviceDate: string): boolean => {
  const d = new Date(serviceDate);
  d.setDate(d.getDate() + 90);
  return new Date() <= d;
};

export const daysUntilDeadline = (serviceDate: string): number => {
  const d = new Date(serviceDate);
  d.setDate(d.getDate() + 90);
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
};

export const isPediatric = (patientDob: string, serviceDate: string): boolean => {
  const dob = new Date(patientDob);
  const svc = new Date(serviceDate);
  const ageMonths =
    (svc.getFullYear() - dob.getFullYear()) * 12 +
    (svc.getMonth() - dob.getMonth());
  return ageMonths < 24;
};

/** Quick summary: how many errors and warnings a claim has. */
export const getValidationSummary = (
  actCodes: ActCode[],
  yearCodes: string[],
  options: ClaimContext,
): { errorCount: number; warningCount: number; infoCount: number } => {
  const { issues } = validateRAMQClaim(actCodes, yearCodes, options);
  return {
    errorCount:   issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    infoCount:    issues.filter(i => i.severity === 'info').length,
  };
};
