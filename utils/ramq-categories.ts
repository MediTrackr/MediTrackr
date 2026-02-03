export type ProfessionalCategory =
  | 'omni'
  | 'specialist'
  | 'resident'
  | 'dietitian'
  | 'nurse'
  | 'inhalotherapist'
  | 'orthotics_lab'
  | 'podiatrist'
  | 'midwife'
  | 'health_establishment'
  | 'rehab_establishment';

export interface RAMQForm {
  number: string;
  title: string;
  system: string;        // which B2B system this unlocks
  purpose: string;       // what you can do once approved
  file: string | null;   // path under /public/guides/ (null = download from RAMQ website)
  required: boolean;     // mandatory vs. optional for this category
}

export interface CategoryConfig {
  label: string;
  labelShort: string;
  providerRegex: RegExp;
  providerNote: string;
  specialtyGroup: string;
  showRole: boolean;
  showStartEnd: boolean;
  showLmp: boolean;
  showObstetrics: boolean;
  showPatientCount: boolean;
  icon: string;
  b2bForms: RAMQForm[];  // B2B access forms needed for this category
}

// ── B2B form definitions ─────────────────────────────────────────────────────

const F4058: RAMQForm = {
  number: '4058',
  title: "Inscription de la clientèle des professionnels de la santé",
  system: "B2B — Inscription clientèle",
  purpose: "Inscrire et modifier les renseignements des patients à l'assurance maladie en ligne",
  file: '/guides/4058.pdf',
  required: true,
};

const F4123: RAMQForm = {
  number: '4123',
  title: "Vérification de l'admissibilité",
  system: "B2B — Admissibilité",
  purpose: "Vérifier en temps réel si un patient est admissible aux services assurés par la RAMQ",
  file: '/guides/4123.pdf',
  required: true,
};

const F4134: RAMQForm = {
  number: '4134',
  title: "Accès SELAT",
  system: "B2B — SELAT (Système en ligne d'accès aux transactions)",
  purpose: "Accéder aux transactions électroniques RAMQ pour les établissements et les laboratoires",
  file: '/guides/4134_0.pdf',
  required: true,
};

const F4444: RAMQForm = {
  number: '4444',
  title: "Identité du médecin de famille",
  system: "B2B — Identité médecin de famille",
  purpose: "Accéder au registre d'identité des médecins de famille (requis en GMF)",
  file: '/guides/4444.pdf',
  required: false,  // required only if working in a GMF context
};

// ── Category definitions ──────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<ProfessionalCategory, CategoryConfig> = {
  omni: {
    label: 'Médecin omnipraticien ou omnipraticienne',
    labelShort: 'Omnipraticien',
    providerRegex: /^1\d{5}$/,
    providerNote: '1XXXXX',
    specialtyGroup: 'omni',
    showRole: true,
    showStartEnd: true,
    showLmp: true,
    showObstetrics: true,
    showPatientCount: true,
    icon: '🩺',
    b2bForms: [
      F4058,
      F4123,
      { ...F4444, required: true },  // required for GMF omnipraticiens
    ],
  },
  specialist: {
    label: 'Médecin spécialiste',
    labelShort: 'Spécialiste',
    providerRegex: /^1\d{5}$/,
    providerNote: '1XXXXX',
    specialtyGroup: 'specialist',
    showRole: true,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🔬',
    b2bForms: [F4058, F4123],
  },
  resident: {
    label: 'Médecin en résidence',
    labelShort: 'Résident',
    providerRegex: /^5\d{5}$/,
    providerNote: '5XXXXX',
    specialtyGroup: 'resident',
    showRole: true,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🎓',
    b2bForms: [F4058, F4123],
  },
  dietitian: {
    label: 'Diététiste',
    labelShort: 'Diététiste',
    providerRegex: /^96\d{4}$/,
    providerNote: '96XXXX',
    specialtyGroup: 'dietitian',
    showRole: false,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🥗',
    b2bForms: [F4123],
  },
  nurse: {
    label: 'Infirmier ou infirmière',
    labelShort: 'Infirmier·ère',
    providerRegex: /^(81|8[2-7])\d{4}$/,
    providerNote: '81XXXX / 82–87XXXX',
    specialtyGroup: 'nurse',
    showRole: false,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '💉',
    b2bForms: [F4123],
  },
  inhalotherapist: {
    label: 'Inhalothérapeute',
    labelShort: 'Inhalothérapeute',
    providerRegex: /^97\d{4}$/,
    providerNote: '97XXXX',
    specialtyGroup: 'inhalotherapist',
    showRole: false,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🫁',
    b2bForms: [F4123],
  },
  orthotics_lab: {
    label: "Laboratoire d'orthèses et de prothèses",
    labelShort: "Labo orthèses/prothèses",
    providerRegex: /^\d{6}$/,
    providerNote: 'Numéro RAMQ (6 chiffres)',
    specialtyGroup: 'orthotics',
    showRole: false,
    showStartEnd: false,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🦿',
    b2bForms: [F4134, F4123],
  },
  podiatrist: {
    label: 'Podiatre',
    labelShort: 'Podiatre',
    providerRegex: /^94\d{4}$/,
    providerNote: '94XXXX',
    specialtyGroup: 'podiatrist',
    showRole: false,
    showStartEnd: true,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🦶',
    b2bForms: [F4123],
  },
  midwife: {
    label: 'Sage-femme',
    labelShort: 'Sage-femme',
    providerRegex: /^93\d{4}$/,
    providerNote: '93XXXX',
    specialtyGroup: 'midwife',
    showRole: false,
    showStartEnd: true,
    showLmp: true,
    showObstetrics: true,
    showPatientCount: true,
    icon: '👶',
    b2bForms: [F4058, F4123],
  },
  health_establishment: {
    label: 'Établissement du réseau de la santé',
    labelShort: 'Établissement (hôpital / CLSC)',
    providerRegex: /^\d{6}$/,
    providerNote: "Numéro d'établissement (6 chiffres)",
    specialtyGroup: 'establishment',
    showRole: false,
    showStartEnd: false,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '🏥',
    b2bForms: [F4058, F4123, F4134],
  },
  rehab_establishment: {
    label: 'Établissement de réadaptation en déficience physique',
    labelShort: 'Réadaptation déficience physique',
    providerRegex: /^\d{6}$/,
    providerNote: "Numéro d'établissement (6 chiffres)",
    specialtyGroup: 'rehab',
    showRole: false,
    showStartEnd: false,
    showLmp: false,
    showObstetrics: false,
    showPatientCount: false,
    icon: '♿',
    b2bForms: [F4123, F4134],
  },
};

// ── Remuneration modes (from GuideOmni / RAMQ billing doc) ──────────────────

export type RemunerationMode = 'RFP' | 'RPV' | 'RPS' | 'RMX';

export const REMUNERATION_MODES: Record<RemunerationMode, { label: string; description: string }> = {
  RFP: {
    label: 'RFP — Rémunération à l\'acte',
    description: 'Facturation par acte médical (fee-for-service). Transmission en temps réel ou en différé.',
  },
  RPV: {
    label: 'RPV — Rémunération à vacation',
    description: 'Tarif horaire, honoraires forfaitaires, per diem ou vacation.',
  },
  RPS: {
    label: 'RPS — Rémunération à salaire',
    description: 'Professionnels à honoraires fixes ou à salaire.',
  },
  RMX: {
    label: 'RMX — Rémunération mixte',
    description: 'Combinaison vacation et acte (RFP + RPV).',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES = Object.entries(CATEGORY_CONFIG) as [ProfessionalCategory, CategoryConfig][];

export function getCategoryConfig(category: ProfessionalCategory | string | null | undefined): CategoryConfig | null {
  if (!category) return null;
  return CATEGORY_CONFIG[category as ProfessionalCategory] ?? null;
}

export function isValidProviderNumberForCategory(num: string, category: ProfessionalCategory): boolean {
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return false;
  return cfg.providerRegex.test(num.replace(/\s/g, ''));
}

/** Aggregate unique B2B forms across multiple selected categories. */
export function getAggregatedForms(categories: ProfessionalCategory[]): RAMQForm[] {
  const seen = new Set<string>();
  const result: RAMQForm[] = [];
  for (const cat of categories) {
    const cfg = CATEGORY_CONFIG[cat];
    if (!cfg) continue;
    for (const form of cfg.b2bForms) {
      if (!seen.has(form.number)) {
        seen.add(form.number);
        // Mark required if ANY selected category requires it
        result.push({ ...form, required: cfg.b2bForms.find(f => f.number === form.number)?.required ?? false });
      }
    }
  }
  return result;
}
