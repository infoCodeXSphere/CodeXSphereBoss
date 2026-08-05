import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

const BRAND = {
  indigo: "#5B6EFF",
  violet: "#9B6BFF",
  dark: "#0B0E14",
  muted: "#666666",
};

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pass = new PassThrough();
    doc.pipe(pass);
    pass.on("data", (chunk) => chunks.push(chunk));
    pass.on("end", () => resolve(Buffer.concat(chunks)));
    pass.on("error", reject);
    doc.end();
  });
}

function header(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(BRAND.indigo).fontSize(22).font("Helvetica-Bold").text("CodeSphere", { continued: false });
  doc.fillColor(BRAND.muted).fontSize(9).font("Helvetica").text("Building Intelligent Solutions");
  doc.moveDown(1.5);
  doc.fillColor(BRAND.dark).fontSize(18).font("Helvetica-Bold").text(title);
  doc.moveDown(0.5);
  doc.strokeColor(BRAND.indigo).lineWidth(2).moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
}

export interface ProposalPdfInput {
  clientName: string;
  title: string;
  sections: {
    companyProfile?: string;
    scope?: string;
    objectives?: string;
    deliverables?: string[];
    timeline?: string;
    milestones?: string[];
    pricing?: string;
    terms?: string;
  };
}

/**
 * Module 8 — Proposal Generator. Produces a real, downloadable PDF
 * (cover page → company profile → scope → objectives → deliverables →
 * timeline → milestones → pricing → terms → acceptance) using the
 * brand's color palette. This is a functional first version, not a
 * mockup — the layout is intentionally simple (no custom fonts/logos
 * embedded) so it renders correctly without additional asset files;
 * swapping in the real CodeSphere logo/typeface is a follow-up
 * polish task, not an architecture change.
 */
export async function generateProposalPdf(input: ProposalPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // Cover page
  doc.fillColor(BRAND.indigo).fontSize(30).font("Helvetica-Bold").text("CodeSphere", { align: "center" });
  doc.moveDown(0.3);
  doc.fillColor(BRAND.muted).fontSize(11).font("Helvetica").text("Building Intelligent Solutions", { align: "center" });
  doc.moveDown(4);
  doc.fillColor(BRAND.dark).fontSize(24).font("Helvetica-Bold").text(input.title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(13).font("Helvetica").fillColor(BRAND.muted).text(`Prepared for ${input.clientName}`, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).text(new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }), { align: "center" });

  doc.addPage();
  header(doc, "Company Profile");
  doc.fillColor(BRAND.dark).fontSize(11).font("Helvetica").text(input.sections.companyProfile || "CodeSphere designs and builds custom software, business management systems, and SaaS products for growing businesses across India and the GCC.");

  doc.addPage();
  header(doc, "Scope & Objectives");
  doc.fontSize(12).font("Helvetica-Bold").text("Scope");
  doc.fontSize(11).font("Helvetica").text(input.sections.scope || "[ Scope to be added ]");
  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").text("Objectives");
  doc.fontSize(11).font("Helvetica").text(input.sections.objectives || "[ Objectives to be added ]");

  doc.addPage();
  header(doc, "Deliverables & Timeline");
  doc.fontSize(12).font("Helvetica-Bold").text("Deliverables");
  (input.sections.deliverables?.length ? input.sections.deliverables : ["[ Deliverables to be added ]"]).forEach((d) => {
    doc.fontSize(11).font("Helvetica").text(`•  ${d}`);
  });
  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").text("Timeline");
  doc.fontSize(11).font("Helvetica").text(input.sections.timeline || "[ Timeline to be added ]");

  if (input.sections.milestones?.length) {
    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold").text("Milestones");
    input.sections.milestones.forEach((m) => doc.fontSize(11).font("Helvetica").text(`•  ${m}`));
  }

  doc.addPage();
  header(doc, "Pricing & Terms");
  doc.fontSize(12).font("Helvetica-Bold").text("Pricing");
  doc.fontSize(11).font("Helvetica").text(input.sections.pricing || "[ Pricing to be added ]");
  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").text("Terms");
  doc.fontSize(11).font("Helvetica").text(input.sections.terms || "Standard CodeSphere terms apply — 50% upfront, 50% on delivery, unless otherwise agreed in writing.");
  doc.moveDown(2);
  doc.fontSize(12).font("Helvetica-Bold").text("Acceptance");
  doc.moveDown(3);
  doc.fontSize(10).font("Helvetica").text("Client Signature: _______________________        Date: _______________");

  return streamToBuffer(doc);
}

export interface QuotationPdfInput {
  clientName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  taxPercent: number;
  discountPercent: number;
  vatNumber?: string;
}

/**
 * Module 9 — Quotation Generator. Line items, discount, tax (VAT-
 * ready), and a computed total. QR code generation is left as a
 * documented follow-up (needs a `qrcode` package + a payment/verify
 * URL to encode, which doesn't exist yet without a payment gateway
 * integration) rather than embedding a QR code that points nowhere.
 */
export async function generateQuotationPdf(input: QuotationPdfInput): Promise<{ buffer: Buffer; total: number }> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  header(doc, "Quotation");

  doc.fontSize(11).font("Helvetica").text(`Prepared for: ${input.clientName}`);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
  if (input.vatNumber) doc.text(`VAT No: ${input.vatNumber}`);
  doc.moveDown(1);

  const tableTop = doc.y;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Description", 50, tableTop, { width: 260 });
  doc.text("Qty", 320, tableTop, { width: 60, align: "right" });
  doc.text("Unit Price", 380, tableTop, { width: 80, align: "right" });
  doc.text("Line Total", 460, tableTop, { width: 85, align: "right" });
  doc.moveDown(0.5);
  doc.strokeColor(BRAND.muted).lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  let subtotal = 0;
  doc.font("Helvetica").fontSize(10);
  input.items.forEach((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;
    const y = doc.y;
    doc.text(item.description, 50, y, { width: 260 });
    doc.text(String(item.quantity), 320, y, { width: 60, align: "right" });
    doc.text(item.unitPrice.toFixed(2), 380, y, { width: 80, align: "right" });
    doc.text(lineTotal.toFixed(2), 460, y, { width: 85, align: "right" });
    doc.moveDown(0.6);
  });

  const discountAmount = subtotal * (input.discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * (input.taxPercent / 100);
  const total = taxable + taxAmount;

  doc.moveDown(0.5);
  doc.strokeColor(BRAND.muted).lineWidth(0.5).moveTo(320, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);
  doc.text(`Subtotal: ${subtotal.toFixed(2)}`, 320, doc.y, { width: 225, align: "right" });
  if (input.discountPercent > 0) doc.text(`Discount (${input.discountPercent}%): -${discountAmount.toFixed(2)}`, { width: 225, align: "right" });
  if (input.taxPercent > 0) doc.text(`Tax (${input.taxPercent}%): ${taxAmount.toFixed(2)}`, { width: 225, align: "right" });
  doc.font("Helvetica-Bold").fontSize(12).text(`Total: ${total.toFixed(2)}`, { width: 225, align: "right" });

  const buffer = await streamToBuffer(doc);
  return { buffer, total };
}
