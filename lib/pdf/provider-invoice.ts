import jsPDF from "jspdf";

export interface LineItem {
  description: string;
  procedure_code?: string;
  quantity: number;
  unit_price: number;
}

export interface ProviderInvoiceData {
  // Provider
  provider_name: string;
  provider_address: string;
  provider_city: string;
  provider_province: string;
  provider_postal: string;
  provider_phone: string;
  provider_fax: string;
  provider_license: string;
  // Patient
  patient_name: string;
  patient_dob: string;
  patient_health_insurance: string;
  patient_address: string;
  // Invoice
  invoice_number: string;
  invoice_date: string;
  service_date: string;
  due_date: string;
  // Clinical
  diagnostic_code: string;
  diagnostic_desc: string;
  notes: string;
  // Lines
  line_items: LineItem[];
  total_amount: number;
  amount_paid: number;
  // Travel insurance context
  insurer_name: string;
  policy_number: string;
}

function hLine(doc: jsPDF, y: number, x1 = 15, x2 = 200) {
  doc.setDrawColor(220, 220, 220);
  doc.line(x1, y, x2, y);
}

export function generateProviderInvoicePDF(data: ProviderInvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = 215.9;

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 165, 0); // primary orange
  doc.text("FACTURE MÉDICALE", 15, 10);
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text("MEDICAL INVOICE — For Insurance Claim Purposes", 15, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 165, 0);
  doc.text(`Nº ${data.invoice_number}`, pageW - 15, 10, { align: "right" });
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  doc.text(`Date: ${data.invoice_date}`, pageW - 15, 16, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ── Provider + Patient block ─────────────────────────────────────────────
  let y = 30;

  // Provider box (left)
  doc.setFillColor(248, 248, 248);
  doc.rect(15, y, 85, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("FOURNISSEUR / PROVIDER", 17, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(data.provider_name || "—", 17, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(data.provider_address || "", 17, y + 17);
  doc.text(`${data.provider_city || ""}${data.provider_province ? `, ${data.provider_province}` : ""}  ${data.provider_postal || ""}`, 17, y + 22);
  doc.text(`Tél: ${data.provider_phone || "—"}`, 17, y + 28);
  if (data.provider_fax) doc.text(`Fax: ${data.provider_fax}`, 17, y + 33);
  if (data.provider_license) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 100, 0);
    doc.text(`Licence / RAMQ: ${data.provider_license}`, 17, y + 39);
  }

  // Patient box (right)
  doc.setFillColor(255, 248, 235);
  doc.rect(110, y, 90, 40, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("PATIENT / BÉNÉFICIAIRE", 112, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(data.patient_name || "—", 112, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  if (data.patient_dob) doc.text(`Date de naissance: ${data.patient_dob}`, 112, y + 17);
  if (data.patient_health_insurance) doc.text(`Assurance maladie: ${data.patient_health_insurance}`, 112, y + 22);
  if (data.patient_address) {
    const addrLines = doc.splitTextToSize(data.patient_address, 84);
    doc.text(addrLines.slice(0, 2), 112, y + 27);
  }

  y += 46;

  // ── Insurance reference ──────────────────────────────────────────────────
  if (data.insurer_name || data.policy_number) {
    doc.setFillColor(230, 240, 255);
    doc.rect(15, y, 185, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 60, 120);
    doc.text("ASSURANCE VOYAGE / TRAVEL INSURANCE:", 17, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.insurer_name || "—"}   Nº police / Policy No: ${data.policy_number || "—"}`, 80, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 14;
  }

  // ── Dates block ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date de service / Date of service: `, 15, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  doc.text(data.service_date || data.invoice_date || "—", 75, y);
  if (data.due_date) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`  ·  Échéance: ${data.due_date}`, 100, y);
  }
  doc.setTextColor(0, 0, 0);
  y += 8;
  hLine(doc, y);

  // ── Diagnosis ────────────────────────────────────────────────────────────
  if (data.diagnostic_code || data.diagnostic_desc) {
    y += 5;
    doc.setFillColor(252, 248, 240);
    doc.rect(15, y, 185, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 80, 0);
    doc.text("DIAGNOSTIC:", 17, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.text(`${data.diagnostic_code ? `[${data.diagnostic_code}]  ` : ""}${data.diagnostic_desc || ""}`, 45, y + 4, { maxWidth: 153 });
    y += 14;
  } else {
    y += 5;
  }

  // ── Line items table ─────────────────────────────────────────────────────
  // Table header
  doc.setFillColor(20, 20, 20);
  doc.rect(15, y, 185, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 165, 0);
  const cols = [17, 70, 140, 160, 185];
  ["Description du service", "Code", "Qté", "Prix unit.", "Montant"].forEach((h, i) => {
    doc.text(h, cols[i], y + 4.5, i === 4 ? { align: "right" } : undefined);
  });
  doc.setTextColor(0, 0, 0);
  y += 8;

  const lines = data.line_items?.length ? data.line_items : [{ description: "Services médicaux", procedure_code: "", quantity: 1, unit_price: data.total_amount }];
  lines.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, y - 1, 185, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    const descLines = doc.splitTextToSize(item.description || "—", 50);
    doc.text(descLines[0], cols[0], y + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(item.procedure_code || "—", cols[1], y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(String(item.quantity || 1), cols[2], y + 4);
    doc.text(`$${(item.unit_price || 0).toFixed(2)}`, cols[3], y + 4);
    doc.setFont("helvetica", "bold");
    doc.text(`$${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}`, cols[4], y + 4, { align: "right" });
    y += 7;
  });

  hLine(doc, y);
  y += 5;

  // ── Totals ────────────────────────────────────────────────────────────────
  const outstanding = (data.total_amount || 0) - (data.amount_paid || 0);

  [
    ["Sous-total / Subtotal", data.total_amount],
    ["Montant reçu / Amount received", data.amount_paid],
  ].forEach(([label, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(label as string, 130, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`$${((val as number) || 0).toFixed(2)}`, 200, y, { align: "right" });
    y += 6;
  });

  hLine(doc, y, 130, 200);
  y += 4;
  doc.setFillColor(10, 10, 10);
  doc.rect(130, y - 1, 70, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 165, 0);
  doc.text("SOLDE DÛ / BALANCE DUE", 132, y + 5);
  doc.text(`$${outstanding.toFixed(2)}`, 198, y + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 13;

  // ── Payment status note ────────────────────────────────────────────────
  doc.setFillColor(240, 255, 240);
  doc.rect(15, y, 185, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 100, 0);
  const paidStatus = data.amount_paid >= data.total_amount
    ? "✓  PAYÉ EN TOTALITÉ / PAID IN FULL"
    : data.amount_paid > 0
    ? `✓  PARTIELLEMENT PAYÉ / PARTIALLY PAID ($${data.amount_paid.toFixed(2)} reçu)`
    : "○  EN ATTENTE DE PAIEMENT / PAYMENT PENDING";
  doc.text(paidStatus, 17, y + 5.5);
  doc.setTextColor(0, 0, 0);
  y += 13;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(data.notes, 183);
    doc.text(noteLines.slice(0, 4), 15, y);
    y += noteLines.slice(0, 4).length * 4.5 + 5;
  }

  hLine(doc, y);
  y += 6;

  // ── Certification ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Je certifie que les services décrits ci-dessus ont été rendus au patient susmentionné à la date indiquée.",
    15, y, { maxWidth: 120 }
  );
  doc.text(
    "I certify that the services described above were rendered to the above-named patient on the date indicated.",
    15, y + 5, { maxWidth: 120 }
  );
  y += 14;
  doc.line(15, y, 100, y);
  doc.line(120, y, 175, y);
  doc.setFontSize(6.5);
  doc.text("Signature du fournisseur / Provider signature", 15, y + 3.5);
  doc.text("Date", 120, y + 3.5);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 263, pageW, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Ce document est une facture officielle émise par le fournisseur de soins. Joignez-la à votre demande de règlement.", pageW / 2, 268, { align: "center" });
  doc.text("This document is an official invoice issued by the healthcare provider. Attach it to your insurance claim.", pageW / 2, 272, { align: "center" });
  doc.setTextColor(80, 80, 80);
  doc.text(`Généré par Meditrackr — ${new Date().toLocaleDateString("fr-CA")}`, pageW / 2, 275, { align: "center" });

  return doc;
}
