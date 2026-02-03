import jsPDF from "jspdf";

export interface CanAssistanceClaimData {
  // Policy
  insurer_name: string;
  contract_no: string;
  group_no: string;
  file_no: string;
  // Beneficiary
  patient_name: string;
  last_name_on_card: string;
  health_insurance_letters: string;
  health_insurance_numbers: string;
  dob: string;
  sex: "M" | "F";
  address_street: string;
  postal_code: string;
  telephone: string;
  email: string;
  // Travel
  departure_date: string;
  return_date: string;
  trip_city_country: string;
  trip_reason: "vacation" | "work" | "school" | "medical" | "other";
  trip_reason_other: string;
  employer_name: string;
  // Healthcare services
  healthcare_reason: string;
  is_accident: boolean;
  accident_type: "car" | "work" | "other";
  accident_date: string;
  services_description: string;
  service_city: string;
  service_province_state: string;
  service_country: string;
  days_hospitalized: string;
  amount_claimed: number;
  currency: "CAD" | "other";
  other_currency: string;
  bills_paid: "no" | "totally" | "partially";
  amount_paid_partial: string;
  // Pre-trip Quebec medical
  pre_doctor_name: string;
  pre_doctor_address: string;
  pre_illness_nature: string;
  pre_last_visit: string;
  pre_hospital_illness: string;
  pre_hospital_name: string;
  pre_medications: string;
  // Other insurance
  group_insurer: string;
  group_policy_no: string;
  other_travel_insurer: string;
}

function sectionHeader(doc: jsPDF, label: string, y: number) {
  doc.setFillColor(0, 60, 120);
  doc.rect(15, y, 180, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(label, 17, y + 4.2);
  doc.setTextColor(0, 0, 0);
}

function field(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(value || "—", x, y + 4);
  doc.setFont("helvetica", "normal");
}

function checkBox(doc: jsPDF, checked: boolean, x: number, y: number, label: string) {
  doc.rect(x, y, 3.5, 3.5);
  if (checked) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("✓", x + 0.3, y + 3);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(label, x + 5, y + 3);
}

function hLine(doc: jsPDF, y: number) {
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
}

const TRIP_REASON_LABELS: Record<string, string> = {
  vacation: "Vacation / Seasonal absence",
  work: "Work",
  school: "School",
  medical: "Receive medical care",
  other: "Other",
};

export function generateCanAssistancePDF(data: CanAssistanceClaimData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = 215.9;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(0, 60, 120);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Croix Bleue / Blue Cross  —  CanAssistance", pageW / 2, 8, { align: "center" });
  doc.setFontSize(8.5);
  doc.text("CLAIM FORM — TRAVEL INSURANCE / DEMANDE DE RÈGLEMENT — ASSURANCE VOYAGE", pageW / 2, 14, { align: "center" });
  doc.setFontSize(6.5);
  doc.setTextColor(180, 210, 255);
  doc.text("01CAN0106B (2024-10)  •  canassistance.com  •  croixbleue.ca", pageW / 2, 17.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let y = 23;

  // ── Policy Info ──────────────────────────────────────────────────────────
  doc.setFillColor(245, 248, 255);
  doc.rect(15, y, 180, 14, "F");
  doc.setDrawColor(0, 60, 120);
  doc.rect(15, y, 180, 14);
  field(doc, "Insurer's Name / Nom de l'assureur", data.insurer_name, 17, y + 3);
  field(doc, "Contract / Certificate No.", data.contract_no, 90, y + 3);
  field(doc, "Group No.", data.group_no, 152, y + 3);
  field(doc, "File No.", data.file_no, 180, y + 3);
  y += 18;

  // ── Section: Beneficiary ────────────────────────────────────────────────
  sectionHeader(doc, "BENEFICIARY (PATIENT) — BÉNÉFICIAIRE (PATIENT)", y);
  y += 9;
  field(doc, "Health Insurance No. — Letters", data.health_insurance_letters, 15, y);
  field(doc, "Health Insurance No. — Numbers", data.health_insurance_numbers, 75, y);
  field(doc, "Date of Birth", data.dob, 150, y);
  field(doc, "Sex", data.sex, 185, y);
  y += 10;
  field(doc, "Last Name / Nom de famille", data.patient_name.split(" ").slice(-1)[0] || data.patient_name, 15, y);
  field(doc, "First Name / Prénom", data.patient_name.split(" ").slice(0, -1).join(" ") || "—", 100, y);
  y += 10;
  field(doc, "Home Address (Street / Rue)", data.address_street, 15, y);
  field(doc, "Postal Code", data.postal_code, 140, y);
  field(doc, "Telephone", data.telephone, 168, y);
  y += 10;
  field(doc, "Email / Courriel", data.email, 15, y);
  y += 10;
  hLine(doc, y);

  // ── Section: Travel Dates ────────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "PERIODS OF TIME OUTSIDE QUÉBEC — SÉJOURS À L'EXTÉRIEUR DU QUÉBEC", y);
  y += 9;
  field(doc, "Location (City, Country)", data.trip_city_country, 15, y);
  field(doc, "Date of Departure from Québec", data.departure_date, 115, y);
  field(doc, "Date of Return to Québec", data.return_date, 165, y);
  y += 11;

  // Trip reason checkboxes
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("Reason for trip / Motif du séjour:", 15, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  const reasons = ["vacation", "work", "school", "medical", "other"] as const;
  reasons.forEach((r, i) => {
    const rx = 15 + (i % 3) * 60;
    const ry = y + Math.floor(i / 3) * 7;
    checkBox(doc, data.trip_reason === r, rx, ry, TRIP_REASON_LABELS[r]);
  });
  if (data.trip_reason === "work" && data.employer_name) {
    doc.setFontSize(7);
    doc.text(`Employer: ${data.employer_name}`, 80, y + 3);
  }
  if (data.trip_reason === "other" && data.trip_reason_other) {
    doc.setFontSize(7);
    doc.text(`Other: ${data.trip_reason_other}`, 80, y + 10);
  }
  y += 17;
  hLine(doc, y);

  // ── Section: Healthcare Services Outside QC ──────────────────────────────
  y += 3;
  sectionHeader(doc, "HEALTHCARE SERVICES OUTSIDE QUÉBEC — SERVICES DE SANTÉ À L'EXTÉRIEUR DU QUÉBEC", y);
  y += 9;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Reason for receiving healthcare:", 15, y);
  const reasonLines = doc.splitTextToSize(data.healthcare_reason || "—", 178);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(reasonLines.slice(0, 2), 15, y + 5);
  y += 14;

  if (data.is_accident) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Type of accident:", 15, y);
    checkBox(doc, data.accident_type === "car", 45, y - 2.5, "Car / Automobile");
    checkBox(doc, data.accident_type === "work", 80, y - 2.5, "Work / Travail");
    checkBox(doc, data.accident_type === "other", 112, y - 2.5, "Other");
    if (data.accident_date) field(doc, "Date of accident", data.accident_date, 145, y - 2.5);
    y += 9;
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Services received (tests, X-rays, surgery, etc.):", 15, y);
  y += 5;
  const svcLines = doc.splitTextToSize(data.services_description || "—", 178);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(svcLines.slice(0, 3), 15, y);
  y += Math.max(svcLines.slice(0, 3).length * 5, 10);

  field(doc, "City / Ville", data.service_city, 15, y);
  field(doc, "Province / State", data.service_province_state, 80, y);
  field(doc, "Country / Pays", data.service_country, 145, y);
  y += 10;
  field(doc, "Days hospitalized / Jours d'hospitalisation", data.days_hospitalized || "0", 15, y);
  y += 10;

  // Reimbursement
  doc.setFillColor(248, 248, 255);
  doc.rect(15, y, 180, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("REIMBURSEMENT / REMBOURSEMENT", 17, y + 4);
  doc.setFont("helvetica", "normal");
  field(doc, "Amount claimed", `$${data.amount_claimed.toFixed(2)} ${data.currency === "other" ? data.other_currency : "CAD"}`, 17, y + 5);
  doc.setFontSize(7);
  doc.text("Bills paid? /  Factures payées?", 120, y + 4);
  checkBox(doc, data.bills_paid === "no", 120, y + 5, "No");
  checkBox(doc, data.bills_paid === "totally", 135, y + 5, "Totally");
  checkBox(doc, data.bills_paid === "partially", 155, y + 5, `Partially: $${data.amount_paid_partial || "—"}`);
  y += 15;
  hLine(doc, y);

  // ── Section: Pre-trip Medical ────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "HEALTHCARE SERVICES IN QUÉBEC (last 6 months before trip) — SERVICES DE SANTÉ AU QUÉBEC", y);
  y += 9;
  field(doc, "Doctor consulted — Name", data.pre_doctor_name, 15, y);
  field(doc, "Nature of illness", data.pre_illness_nature, 115, y);
  y += 9;
  field(doc, "Doctor address", data.pre_doctor_address, 15, y);
  field(doc, "Date of last visit", data.pre_last_visit, 140, y);
  y += 9;
  field(doc, "Hospitalized — Hospital name", data.pre_hospital_name, 15, y);
  field(doc, "Nature of illness", data.pre_hospital_illness, 115, y);
  y += 9;
  field(doc, "Medications taken in last 6 months", data.pre_medications, 15, y);
  y += 10;
  hLine(doc, y);

  // ── Section: Other Insurance ─────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "OTHER INSURANCE — AUTRES ASSURANCES", y);
  y += 9;
  field(doc, "Group Insurer / Assureur collectif", data.group_insurer, 15, y);
  field(doc, "Policy No.", data.group_policy_no, 115, y);
  y += 9;
  field(doc, "Other travel insurance / Autre assurance voyage", data.other_travel_insurer, 15, y);
  y += 12;
  hLine(doc, y);

  // ── Mandate section ───────────────────────────────────────────────────────
  y += 3;
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, 180, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("MANDATE / MANDAT — AGREEMENT AND AUTHORIZATION", 17, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("I, the undersigned, empower CanAssistance Inc. on behalf of the main insurer to submit claims to the Régie de l'assurance maladie du Québec.", 17, y + 10, { maxWidth: 176 });
  doc.text("I declare that the information and details on this form are complete and true. False declarations may nullify the insurance certificate.", 17, y + 16, { maxWidth: 176 });
  y += 21;
  doc.line(17, y, 110, y);
  doc.line(130, y, 193, y);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Signature of Beneficiary / Signature du bénéficiaire", 17, y + 3.5);
  doc.text("Date (YYYY-MM-DD)", 130, y + 3.5);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor(0, 60, 120);
  doc.rect(0, 265, pageW, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 210, 255);
  doc.text("CanAssistance — Service des Règlements Voyage — CP 3888, succursale B, Montréal (Québec) H3B 3L7", pageW / 2, 270, { align: "center" });
  doc.text("canassistance.com/fr/assures/depot  |  canassistance.com/en/policyholder/depot", pageW / 2, 274, { align: "center" });
  doc.setTextColor(120, 160, 220);
  doc.text(`Generated by Meditrackr — ${new Date().toLocaleDateString("fr-CA")}`, pageW / 2, 277, { align: "center" });

  return doc;
}
