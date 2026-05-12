// PFSI / IFHP claim validation
// Payer: Medavie Blue Cross on behalf of IRCC (Immigration, Refugees and Citizenship Canada)
// Coverage: interim health benefits for protected persons, resettled refugees, claimants

export interface PFSIServiceLine {
  invoice_number?:       string;
  date_of_service?:      string;
  fee_code?:             string;
  units_of_time?:        string | number;
  icd_code?:             string;
  prescriber_designation?: string;
  amount?:               number;
}

export interface PFSIClaimContext {
  patient_name?:         string;
  client_id?:            string;   // IFHP client ID
  patient_dob?:          string;
  approval_type?:        'prior' | 'post';
  specialty?:            string;
  referring_prescriber?: string;
  service_lines?:        PFSIServiceLine[];
  additional_info?:      string;
}

export interface PFSIValidationIssue {
  severity:   'error' | 'warning' | 'info';
  code:       string;
  message:    string;
  suggestion?: string;
  field?:     string;
  ruleRef?:   string;
}

export interface PFSIValidationResult {
  isValid:  boolean;
  issues:   PFSIValidationIssue[];
  errors:   string[];
  warnings: string[];
}

// ── IFHP client ID validation ──────────────────────────────────────────────
// Format: 10-16 alphanumeric characters (Medavie Blue Cross format)
// Often looks like: 1234567890AB or numeric only
function isValidClientId(id: string): boolean {
  const clean = id.replace(/[\s-]/g, '');
  return /^[A-Z0-9]{8,16}$/i.test(clean);
}

// ── ICD code validation ────────────────────────────────────────────────────
// Accept ICD-9 (NNN.N) and ICD-10 (A00.0 style)
function isValidICD(code: string): boolean {
  const c = code.trim().toUpperCase();
  // ICD-10: letter + 2 digits + optional decimal + optional suffix
  if (/^[A-Z]\d{2}(\.\d{1,4})?$/.test(c)) return true;
  // ICD-9: 3 digits + optional decimal
  if (/^\d{3}(\.\d{1,2})?$/.test(c)) return true;
  return false;
}

// ── Fee code validation ────────────────────────────────────────────────────
// PFSI uses a mix of RAMQ fee codes and Blue Cross procedure codes
// Basic: must be 4-6 digit or alphanumeric
function isValidFeeCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/i.test(code.trim());
}

// ── Main validator ─────────────────────────────────────────────────────────

export function validatePFSIClaim(ctx: PFSIClaimContext): PFSIValidationResult {
  const issues: PFSIValidationIssue[] = [];

  // 1. Patient name
  if (!ctx.patient_name?.trim()) {
    issues.push({
      severity:   'error',
      code:       'PF-001',
      message:    'Le nom du patient est obligatoire.',
      field:      'patient_name',
      suggestion: 'Entrez le nom complet (prénom nom) du bénéficiaire PFSI.',
      ruleRef:    'IFHP Claim Form — Section 1',
    });
  }

  // 2. IFHP client ID
  if (!ctx.client_id?.trim()) {
    issues.push({
      severity:   'error',
      code:       'PF-002',
      message:    'Le numéro d\'identification IFHP est obligatoire.',
      field:      'client_id',
      suggestion: 'Entrez le numéro de client PFSI/IFHP (8–16 caractères alphanumériques).',
      ruleRef:    'IFHP Claim Form — Section 1',
    });
  } else if (!isValidClientId(ctx.client_id)) {
    issues.push({
      severity:   'error',
      code:       'PF-003',
      message:    `Numéro IFHP invalide : "${ctx.client_id}". Format attendu : 8–16 caractères alphanumériques.`,
      field:      'client_id',
      suggestion: 'Vérifiez la carte de bénéficiaire IFHP ou contactez Medavie Blue Cross.',
      ruleRef:    'IFHP Claim Form — Section 1',
    });
  }

  // 3. Date of birth
  if (!ctx.patient_dob) {
    issues.push({
      severity:   'warning',
      code:       'PF-004',
      message:    'La date de naissance du patient est manquante.',
      field:      'patient_dob',
      suggestion: 'Ajoutez la date de naissance pour éviter le rejet par Medavie Blue Cross.',
      ruleRef:    'IFHP Claim Form — Section 1',
    });
  } else {
    const dob = new Date(ctx.patient_dob);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      issues.push({
        severity: 'error',
        code:     'PF-005',
        message:  'Date de naissance invalide ou dans le futur.',
        field:    'patient_dob',
      });
    }
  }

  // 4. Service lines
  const lines = ctx.service_lines ?? [];

  if (lines.length === 0) {
    issues.push({
      severity:   'error',
      code:       'PF-010',
      message:    'Aucune ligne de service. Au moins une ligne est requise.',
      field:      'service_lines',
      suggestion: 'Ajoutez les services rendus avec leur code d\'honoraires.',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setFullYear(today.getFullYear() - 1); // PFSI: 1-year submission window

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLabel = `Ligne ${i + 1}`;

    // Service date
    if (!line.date_of_service) {
      issues.push({
        severity:   'error',
        code:       'PF-011',
        message:    `${lineLabel} : date de service manquante.`,
        field:      `service_lines[${i}].date_of_service`,
        suggestion: 'Entrez la date à laquelle le service a été rendu.',
      });
    } else {
      const sd = new Date(line.date_of_service);
      if (isNaN(sd.getTime())) {
        issues.push({ severity: 'error', code: 'PF-012', message: `${lineLabel} : date de service invalide.`, field: `service_lines[${i}].date_of_service` });
      } else if (sd > today) {
        issues.push({ severity: 'error', code: 'PF-013', message: `${lineLabel} : date de service dans le futur.`, field: `service_lines[${i}].date_of_service` });
      } else if (sd < cutoff) {
        issues.push({
          severity:   'warning',
          code:       'PF-014',
          message:    `${lineLabel} : service daté de plus d'un an (${line.date_of_service}). Risque de rejet par délai.`,
          field:      `service_lines[${i}].date_of_service`,
          suggestion: 'Vérifiez si le délai de soumission PFSI est encore ouvert pour cette date.',
        });
      }
    }

    // Fee code
    if (!line.fee_code?.trim()) {
      issues.push({
        severity:   'error',
        code:       'PF-020',
        message:    `${lineLabel} : code d'honoraires manquant.`,
        field:      `service_lines[${i}].fee_code`,
        suggestion: 'Consultez le guide tarifaire PFSI/IFHP de Medavie Blue Cross.',
      });
    } else if (!isValidFeeCode(line.fee_code)) {
      issues.push({
        severity:   'warning',
        code:       'PF-021',
        message:    `${lineLabel} : code d'honoraires "${line.fee_code}" au format inhabituel.`,
        field:      `service_lines[${i}].fee_code`,
        suggestion: 'Vérifiez que le code correspond à la grille tarifaire PFSI.',
      });
    }

    // ICD code
    if (!line.icd_code?.trim()) {
      issues.push({
        severity:   'warning',
        code:       'PF-030',
        message:    `${lineLabel} : code diagnostique CIM absent.`,
        field:      `service_lines[${i}].icd_code`,
        suggestion: 'Ajoutez un code CIM-9 ou CIM-10 pour justifier le service.',
        ruleRef:    'IFHP Claim Form — Section 3',
      });
    } else if (!isValidICD(line.icd_code)) {
      issues.push({
        severity:   'error',
        code:       'PF-031',
        message:    `${lineLabel} : code CIM "${line.icd_code}" invalide.`,
        field:      `service_lines[${i}].icd_code`,
        suggestion: 'Format attendu : CIM-10 (ex. J06.9) ou CIM-9 (ex. 460).',
      });
    }

    // Amount
    if (!line.amount || line.amount <= 0) {
      issues.push({
        severity: 'error',
        code:     'PF-040',
        message:  `${lineLabel} : montant manquant ou nul.`,
        field:    `service_lines[${i}].amount`,
      });
    } else if (line.amount > 2000) {
      issues.push({
        severity:   'warning',
        code:       'PF-041',
        message:    `${lineLabel} : montant élevé ($${line.amount.toFixed(2)}) — vérifiez si une autorisation préalable est requise.`,
        field:      `service_lines[${i}].amount`,
        suggestion: ctx.approval_type === 'prior'
          ? 'Autorisation préalable sélectionnée — assurez-vous d\'avoir le numéro d\'approbation.'
          : 'Si le montant dépasse le seuil PFSI, une autorisation préalable peut être nécessaire.',
      });
    }

    // Units
    const units = parseFloat(String(line.units_of_time ?? '1'));
    if (isNaN(units) || units <= 0) {
      issues.push({
        severity: 'warning',
        code:     'PF-050',
        message:  `${lineLabel} : unités de temps invalides ou manquantes.`,
        field:    `service_lines[${i}].units_of_time`,
        suggestion: 'Entrez le nombre d\'unités (ex. 1 consultation = 1).',
      });
    }
  }

  // 5. Prior approval without justification
  if (ctx.approval_type === 'prior' && !ctx.additional_info?.trim()) {
    issues.push({
      severity:   'warning',
      code:       'PF-060',
      message:    'Demande préalable sans justification clinique (section 4 vide).',
      field:      'additional_info',
      suggestion: 'Ajoutez les détails cliniques justifiant la demande préalable.',
      ruleRef:    'IFHP Claim Form — Section 4',
    });
  }

  // 6. Specialist without referring prescriber
  if (ctx.specialty && !ctx.referring_prescriber?.trim()) {
    issues.push({
      severity:   'info',
      code:       'PF-070',
      message:    'Spécialiste sans médecin référent indiqué.',
      field:      'referring_prescriber',
      suggestion: 'Si le patient a été référé, indiquez le nom du médecin référent.',
      ruleRef:    'IFHP Claim Form — Section 2',
    });
  }

  // 7. Total amount check
  const computedTotal = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  if (computedTotal === 0 && lines.length > 0) {
    issues.push({
      severity: 'error',
      code:     'PF-080',
      message:  'Le total réclamé est $0.00.',
      suggestion: 'Vérifiez que les montants sont renseignés pour toutes les lignes.',
    });
  }

  const errors   = issues.filter(i => i.severity === 'error').map(i => i.message);
  const warnings = issues.filter(i => i.severity === 'warning').map(i => i.message);

  return { isValid: errors.length === 0, issues, errors, warnings };
}

export function getPFSIValidationSummary(result: PFSIValidationResult) {
  return {
    errorCount:   result.issues.filter(i => i.severity === 'error').length,
    warningCount: result.issues.filter(i => i.severity === 'warning').length,
    infoCount:    result.issues.filter(i => i.severity === 'info').length,
  };
}
