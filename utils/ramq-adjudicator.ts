import { ProfessionalCategory, isValidProviderNumberForCategory } from './ramq-categories';

const PRISE_EN_CHARGE_CODES = ['15825', '15826', '15829', '15830'];

interface ActCode {
  code: string;
  fee: number;
  quantity: number;
}

export const validateRAMQClaim = (
  actCodes: ActCode[],
  yearCodes: string[] = [],
  options: {
    serviceDate?: string;
    doctorRamq?: string;
    locationCode?: string;
    patientDob?: string;
    diagnosticCode?: string;
    professionalCategory?: ProfessionalCategory;
  } = {}
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── 1. 90-day billing deadline (GuideOmni s.1.2) ────────────────────────
  if (options.serviceDate) {
    const serviceDate = new Date(options.serviceDate);
    const deadline = new Date(serviceDate);
    deadline.setDate(deadline.getDate() + 90);
    if (new Date() > deadline) {
      errors.push(
        `Délai de facturation dépassé : les services du ${options.serviceDate} devaient être soumis avant le ${deadline.toISOString().split('T')[0]}. Facture non recevable.`
      );
    } else {
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 10) {
        warnings.push(`Attention : il ne reste que ${daysLeft} jour(s) avant la limite de 90 jours.`);
      }
    }
  }

  // ── 2. Provider number — validated against professional category ──────────
  if (options.doctorRamq && options.doctorRamq.trim() !== '') {
    const num = options.doctorRamq.replace(/\s/g, '');
    if (options.professionalCategory) {
      if (!isValidProviderNumberForCategory(num, options.professionalCategory)) {
        errors.push(
          `Numéro de professionnel invalide (${options.doctorRamq}) pour la catégorie sélectionnée. Vérifiez le format attendu.`
        );
      }
    } else {
      // Fallback: accept 1XXXXX or 5XXXXX (médecins seulement)
      if (!/^[15]\d{5}$/.test(num)) {
        errors.push(
          `Numéro de médecin invalide (${options.doctorRamq}). Doit être 6 chiffres commençant par 1 ou 5.`
        );
      }
    }
  }

  // ── 3. Duplicate consultation codes ─────────────────────────────────────
  const consultations = actCodes.filter(act => act.code?.startsWith('001'));
  if (consultations.length > 1) {
    errors.push('Codes de consultation en double détectés pour la même date de service.');
  }

  // ── 4. Minimum fee ───────────────────────────────────────────────────────
  const total = actCodes.reduce((sum, act) => sum + (act.fee * act.quantity), 0);
  if (total <= 0) {
    errors.push('Le montant total réclamé doit être supérieur à 0 $.');
  }

  // ── 5. Prise en charge + Examen complet conflict ─────────────────────────
  const hasPriseEnCharge = actCodes.some(act => PRISE_EN_CHARGE_CODES.includes(act.code));
  if (hasPriseEnCharge && yearCodes.includes('00097')) {
    errors.push(
      'Prise en charge (15825–15830) non facturable : un Examen complet majeur (00097) a déjà été facturé pour ce patient cette année.'
    );
  }

  // ── 6. Pediatric majoration reminder ─────────────────────────────────────
  if (options.patientDob && options.serviceDate) {
    const dob = new Date(options.patientDob);
    const svc = new Date(options.serviceDate);
    const ageMonths =
      (svc.getFullYear() - dob.getFullYear()) * 12 +
      (svc.getMonth() - dob.getMonth());
    if (ageMonths < 24) {
      warnings.push(
        `Patient âgé de ${ageMonths} mois au moment du service (< 2 ans). Vérifiez l'application de la majoration pédiatrique (Annexe II, +50 %).`
      );
    }
  }

  // ── 7. Diagnostic code required by FacturActe ────────────────────────────
  if (!options.diagnosticCode) {
    warnings.push(
      "Code diagnostique (CIM-9/CIM-10) manquant. Ce champ est obligatoire dans FacturActe à l'étape 1."
    );
  }

  return {
    isValid: errors.length === 0,
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
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

export const isPediatric = (patientDob: string, serviceDate: string): boolean => {
  const dob = new Date(patientDob);
  const svc = new Date(serviceDate);
  const ageMonths =
    (svc.getFullYear() - dob.getFullYear()) * 12 +
    (svc.getMonth() - dob.getMonth());
  return ageMonths < 24;
};
