import jsPDF from "jspdf";

export interface PFSILine {
  invoice_number: string;
  date_of_service: string;
  fee_code: string;
  units_of_time: string;
  icd_code: string;
  prescriber_designation: string;
  amount: number;
}

export interface PFSIClaimData {
  approval_type: "prior" | "post";
  // Client
  patient_name: string;
  client_id: string;
  dob: string;
  // Provider
  specialty: string;
  referring_prescriber: string;
  provider_name: string;
  provider_number: string;
  provider_address: string;
  provider_city: string;
  provider_province: string;
  provider_postal: string;
  provider_phone: string;
  provider_fax: string;
  // Claim lines
  lines: PFSILine[];
  // Section 4
  additional_info: string;
}

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
}

function sectionHeader(doc: jsPDF, label: string, y: number) {
  doc.setFillColor(220, 30, 30);
  doc.rect(15, y, 180, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(label, 17, y + 4.2);
  doc.setTextColor(0, 0, 0);
}

function field(doc: jsPDF, label: string, value: string, x: number, y: number, _w = 55) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(value || "—", x, y + 4);
  doc.setFont("helvetica", "normal");
}

export function generatePFSIPDF(data: PFSIClaimData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = 215.9;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("INTERIM FEDERAL HEALTH PROGRAM", pageW / 2, 7, { align: "center" });
  doc.setFontSize(8.5);
  doc.text("MEDICAL/GENERAL SERVICES CLAIM FORM", pageW / 2, 13, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(180, 210, 255);
  doc.text("Medavie Blue Cross — CIC-001", pageW / 2, 17, { align: "center" });

  // Approval type
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const priorX = 15, postX = 65;
  doc.rect(priorX, 21, 4, 4);
  if (data.approval_type === "prior") doc.text("✓", priorX + 0.5, 24.5);
  doc.text("PRIOR APPROVAL", priorX + 5.5, 24.5);
  doc.rect(postX, 21, 4, 4);
  if (data.approval_type === "post") doc.text("✓", postX + 0.5, 24.5);
  doc.text("POST APPROVAL", postX + 5.5, 24.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(180, 0, 0);
  doc.text('PROTECTED "B" (WHEN COMPLETED)', 195, 24.5, { align: "right" });
  doc.setTextColor(0, 0, 0);

  let y = 30;

  // ── Section 1: Client ───────────────────────────────────────────────────
  sectionHeader(doc, "1.  CLIENT INFORMATION", y);
  y += 9;
  field(doc, "Name", data.patient_name, 15, y);
  field(doc, "Client ID Number (IFHP)", data.client_id, 90, y);
  field(doc, "Date of Birth", data.dob, 160, y);
  y += 10;
  line(doc, y);

  // ── Section 2: Provider ─────────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "2.  PROVIDER INFORMATION", y);
  y += 9;
  field(doc, "Specialty (if applicable)", data.specialty, 15, y);
  field(doc, "Referring Prescriber (if specialist)", data.referring_prescriber, 110, y);
  y += 10;
  field(doc, "Provider Name", data.provider_name, 15, y);
  field(doc, "Provider Number", data.provider_number, 140, y);
  y += 10;
  field(doc, "Address", data.provider_address, 15, y);
  y += 10;
  field(doc, "City", data.provider_city, 15, y);
  field(doc, "Province", data.provider_province, 80, y);
  field(doc, "Postal Code", data.provider_postal, 120, y);
  y += 10;
  field(doc, "Telephone", data.provider_phone, 15, y);
  field(doc, "Fax Number", data.provider_fax, 100, y);
  y += 10;
  line(doc, y);

  // ── Section 3: Claim Lines ──────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "3.  CLAIM INFORMATION", y);
  y += 8;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, 180, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  const cols = [15, 50, 80, 105, 120, 165, 182];
  const headers = ["Invoice #", "Date of Service", "Fee Code", "Units", "ICD 9/10 Code / Diagnosis", "P*", "Amount"];
  headers.forEach((h, i) => doc.text(h, cols[i] + 1, y + 4));
  doc.setTextColor(0, 0, 0);
  y += 7;

  let total = 0;
  const maxLines = Math.min(data.lines.length, 5);
  for (let i = 0; i < maxLines; i++) {
    const l = data.lines[i];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(15, y - 1, 180, 6, "F");
    }
    doc.text(l.invoice_number || "—", cols[0] + 1, y + 3.5);
    doc.text(l.date_of_service || "—", cols[1] + 1, y + 3.5);
    doc.text(l.fee_code || "—", cols[2] + 1, y + 3.5);
    doc.text(l.units_of_time || "—", cols[3] + 1, y + 3.5);
    doc.text(doc.splitTextToSize(l.icd_code || "—", 42)[0], cols[4] + 1, y + 3.5);
    doc.setFont("helvetica", "bold");
    doc.text(l.prescriber_designation || "MD", cols[5] + 1, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.text(`$${(l.amount || 0).toFixed(2)}`, cols[6] + 1, y + 3.5);
    total += l.amount || 0;
    y += 6;
  }
  // Add empty rows if < 5 lines
  for (let i = maxLines; i < 5; i++) {
    doc.setFillColor(i % 2 === 0 ? 252 : 255, 252, 255);
    doc.rect(15, y - 1, 180, 6, "F");
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`TOTALS: $${total.toFixed(2)}`, 190, y + 2, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 0, 0);
  doc.text(
    "The IFHP does not cover services claimable under any other public or private health insurance plan. No benefit coordination or co-payments.",
    15, y, { maxWidth: 180 }
  );
  doc.text("NOTE: Providers are responsible for claiming taxes on taxable services and products.", 15, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 12;
  line(doc, y);

  // ── Section 4: Additional Info ──────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "4.  ADDITIONAL INFORMATION FOR PRIOR/POST APPROVAL", y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Provide clinical details/justification and/or attach supporting documentation.", 15, y);
  y += 6;
  doc.setFontSize(8.5);
  const infoLines = doc.splitTextToSize(data.additional_info || "", 178);
  doc.text(infoLines.slice(0, 4), 15, y);
  y += Math.max(infoLines.slice(0, 4).length * 5, 20);
  line(doc, y);

  // ── Section 5: Certification ────────────────────────────────────────────
  y += 3;
  sectionHeader(doc, "5.  CERTIFICATION", y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "I hereby certify that the above services have been rendered, that the claim was made in accordance with the terms and conditions of the IFHP.",
    15, y, { maxWidth: 180 }
  );
  y += 10;
  doc.line(15, y, 120, y);
  doc.line(135, y, 190, y);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Provider's Original Signature / Stamp", 15, y + 3.5);
  doc.text("Date", 135, y + 3.5);
  doc.setTextColor(0, 0, 0);
  y += 12;
  doc.line(15, y, 120, y);
  doc.line(135, y, 190, y);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Client's Signature", 15, y + 3.5);
  doc.text("Date", 135, y + 3.5);
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ── Footer ──────────────────────────────────────────────────────────────
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, 180, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("MAIL TO", 15 + 90, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Interim Federal Health Program", 15 + 90, y + 8, { align: "center" });
  doc.text("Medavie Blue Cross  —  644 Main Street PO Box 6000 Moncton NB E1C 0P9", 15 + 90, y + 12, { align: "center" });
  doc.text("Toll-free: 1-888-614-1880", 15 + 90, y + 16, { align: "center" });

  // Generated watermark
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated by Meditrackr — ${new Date().toLocaleDateString("en-CA")}`, 195, 270, { align: "right" });

  return doc;
}
