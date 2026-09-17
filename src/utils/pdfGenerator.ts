import { jsPDF } from 'jspdf';
import type { Property, Room, Tenant, Payment } from '../types';
import { formatUGX, formatDate } from './formatters';

export interface ReceiptData {
  property: Property;
  tenant: Tenant;
  room?: Room;
  payment: Payment;
}

export function generateReceiptPdf(data: ReceiptData): { doc: jsPDF; filename: string; blobUrl: string } {
  const { property, tenant, room, payment } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard compact receipt size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  // Background card box
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin - 4, y - 4, contentWidth + 8, 182, 3, 3, 'FD');

  // Green top brand bar
  doc.setFillColor(5, 150, 105); // #059669 Emerald
  doc.rect(margin - 4, y - 4, contentWidth + 8, 4, 'F');

  y += 6;

  // 1. PROPERTY HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(property.name || 'CL LODGES AND HOMES / CL APARTMENTS', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748B
  if (property.address) {
    doc.text(property.address, margin, y);
    y += 4;
  }
  doc.text(`Tel: ${property.ownerPhone || 'N/A'}`, margin, y);

  y += 6;
  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  y += 7;

  // 2. RECEIPT TITLE & NUMBER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105); // #059669 Emerald
  doc.text('PAYMENT RECEIPT', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Receipt No: ${payment.receiptNumber}`, margin + contentWidth, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(payment.paymentDate)}`, margin + contentWidth, y, { align: 'right' });

  y += 4;
  // Divider
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;

  // 3. TENANT DETAILS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TENANT DETAILS', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const drawRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(value, margin + 30, y);
    y += 4.5;
  };

  drawRow('Name:', tenant.fullName);
  const roomDesc = room ? `${room.number} — ${room.type}` : 'Room';
  drawRow('Room:', roomDesc);
  drawRow('Phone:', tenant.phone);

  y += 2;
  // Divider
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;

  // 4. PAYMENT DETAILS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT DETAILS', margin, y);

  y += 5;
  drawRow('Period:', payment.periodMonth);
  drawRow('Rent Due:', formatUGX(payment.amountDue));
  
  // Highlight Amount Paid
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Paid:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // #059669 Green
  doc.text(formatUGX(payment.amountPaid), margin + 30, y);
  y += 4.5;

  const balanceRemaining = Math.max(0, payment.amountDue - payment.amountPaid);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Balance:', margin, y);
  doc.setFont('helvetica', 'bold');
  if (balanceRemaining > 0) {
    doc.setTextColor(239, 68, 68); // Red
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(formatUGX(balanceRemaining), margin + 30, y);
  y += 4.5;

  drawRow('Method:', payment.paymentMethod);
  if (payment.referenceNumber) {
    drawRow('Ref:', payment.referenceNumber);
  }
  if (payment.notes) {
    drawRow('Notes:', payment.notes);
  }

  y += 2;
  // Divider
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;

  // 5. STATUS BADGE
  const isPaidInFull = payment.amountPaid >= payment.amountDue;
  if (isPaidInFull) {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(5, 150, 105);
    doc.roundedRect(margin, y - 1, contentWidth, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('PAID IN FULL', margin + contentWidth / 2, y + 4, { align: 'center' });
  } else {
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(margin, y - 1, contentWidth, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(239, 68, 68);
    doc.text(`PARTIAL PAYMENT — Balance ${formatUGX(balanceRemaining)}`, margin + contentWidth / 2, y + 4, { align: 'center' });
  }

  y += 13;

  // 6. SIGNATURE LINE & AUTHORIZATION
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + contentWidth - 45, y, margin + contentWidth, y);
  y += 3.5;
  doc.text(`Authorized by: ${property.ownerName || 'Landlord'}`, margin + contentWidth, y, { align: 'right' });

  y += 6;
  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  y += 4.5;

  // 7. FOOTER & ATTRIBUTION
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an official receipt. Thank you for your payment.', margin + contentWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('CL LODGES AND HOMES / CL APARTMENTS • Rental Property Management', margin + contentWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.setFontSize(6.5);
  doc.setTextColor(160, 174, 192);
  doc.text('Built by NileSites — Professional Digital Solutions for Uganda (nilesites.vercel.app)', margin + contentWidth / 2, y, { align: 'center' });

  // Sanitize tenant name for filename
  const cleanTenantName = tenant.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Receipt-${payment.receiptNumber}-${cleanTenantName}.pdf`;

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, filename, blobUrl };
}
