import React, { useState } from 'react';
import { Download, Share2, Printer, CheckCircle2, Home, Phone, MessageSquare, Check, ArrowLeft } from 'lucide-react';
import { Modal } from './Modal';
import type { Property, Room, Tenant, Payment } from '../types';
import { formatUGX, formatDate, getWhatsAppReceiptUrl } from '../utils/formatters';
import { generateReceiptPdf, shareReceiptPdf } from '../utils/pdfGenerator';
import { useToast } from './Toast';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  tenant: Tenant;
  room?: Room;
  payment: Payment;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  property,
  tenant,
  room,
  payment,
}) => {
  const { showSuccess, showError } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const isPaidInFull = payment.amountPaid >= payment.amountDue;
  const balanceRemaining = Math.max(0, payment.amountDue - payment.amountPaid);

  const handleSharePdf = async () => {
    try {
      setIsSharing(true);
      const result = await shareReceiptPdf({ property, tenant, room, payment });
      if (result.method === 'native-share') {
        if (result.success) {
          showSuccess('PDF Receipt shared successfully!');
        }
      } else {
        // Download fallback occurred
        showSuccess('PDF downloaded to your device! Opening WhatsApp to attach...');
        const whatsappUrl = getWhatsAppReceiptUrl({
          tenantPhone: tenant.phone,
          tenantName: tenant.fullName,
          period: payment.periodMonth,
          amount: payment.amountPaid,
          receiptNo: payment.receiptNumber,
          ownerName: property.ownerName,
        });
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share failed:', err);
        showError('Could not share directly. Downloading PDF to device.');
        handleDownloadPdf();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      const { filename, blobUrl } = generateReceiptPdf({ property, tenant, room, payment });
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess(`PDF saved: ${filename}`);
    } catch (err) {
      console.error(err);
      showError('Failed to generate PDF download.');
    }
  };

  const handleWhatsAppTextShare = () => {
    const url = getWhatsAppReceiptUrl({
      tenantPhone: tenant.phone,
      tenantName: tenant.fullName,
      period: payment.periodMonth,
      amount: payment.amountPaid,
      receiptNo: payment.receiptNumber,
      ownerName: property.ownerName,
    });
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" maxWidth="md">
      <div className="flex flex-col gap-4">
        {/* Action Buttons Bar */}
        <div className="space-y-2">
          {/* Primary Action: Share PDF Receipt */}
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={isSharing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-black hover:opacity-95 active:scale-98 text-white text-sm font-bold shadow-md transition min-h-[48px]"
          >
            <Share2 className="w-4 h-4 text-emerald-300" />
            <span>{isSharing ? 'Preparing PDF...' : 'Share PDF Receipt (WhatsApp / All Apps)'}</span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded-md uppercase font-mono font-semibold">
              PDF
            </span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black hover:bg-zinc-800 active:scale-95 text-white text-xs font-semibold shadow-xs transition min-h-[44px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppTextShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition min-h-[44px]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Msg</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold transition min-h-[44px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Printable/Preview Receipt Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-5 space-y-4 text-slate-800 font-sans">
          {/* Top Brand Header */}
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-base font-heading">
                  <Home className="w-4 h-4" />
                  <span>{property.name || 'CL LODGES AND HOMES / CL APARTMENTS'}</span>
                </div>
                {property.address && (
                  <p className="text-xs text-slate-500 mt-0.5">{property.address}</p>
                )}
                <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Tel: {property.ownerPhone || 'N/A'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Official
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Info Title */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">Payment Receipt</span>
              <p className="text-sm font-bold text-slate-900 font-heading">{payment.receiptNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Date</span>
              <p className="text-xs font-semibold text-slate-700">{formatDate(payment.paymentDate)}</p>
            </div>
          </div>

          {/* Tenant Details */}
          <div className="space-y-1.5 text-xs border-b border-slate-200 pb-3">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Tenant Details</p>
            <div className="grid grid-cols-3 gap-1 pt-1">
              <span className="text-slate-500">Name:</span>
              <span className="col-span-2 font-bold text-slate-800">{tenant.fullName}</span>
              
              <span className="text-slate-500">Room:</span>
              <span className="col-span-2 font-semibold text-slate-800">
                {room ? `${room.number} — ${room.type}` : 'Assigned Unit'}
              </span>
              
              <span className="text-slate-500">Phone:</span>
              <span className="col-span-2 font-medium text-slate-800">{tenant.phone}</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-2 text-xs border-b border-slate-200 pb-3">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Payment Details</p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <span className="text-slate-500">Period:</span>
              <span className="col-span-2 font-semibold text-slate-800">{payment.periodMonth}</span>

              <span className="text-slate-500">Rent Due:</span>
              <span className="col-span-2 font-semibold text-slate-700 font-amount">{formatUGX(payment.amountDue)}</span>

              <span className="text-slate-500">Amount Paid:</span>
              <span className="col-span-2 font-bold text-emerald-700 text-sm font-amount">{formatUGX(payment.amountPaid)}</span>

              <span className="text-slate-500">Balance:</span>
              <span className={`col-span-2 font-bold font-amount ${balanceRemaining > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                {formatUGX(balanceRemaining)}
              </span>

              <span className="text-slate-500">Method:</span>
              <span className="col-span-2 font-medium text-slate-800">{payment.paymentMethod}</span>

              {payment.referenceNumber && (
                <>
                  <span className="text-slate-500">Ref:</span>
                  <span className="col-span-2 font-mono text-[11px] text-slate-700">{payment.referenceNumber}</span>
                </>
              )}

              {payment.notes && (
                <>
                  <span className="text-slate-500">Notes:</span>
                  <span className="col-span-2 text-slate-600 italic">{payment.notes}</span>
                </>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`p-2.5 rounded-xl text-center text-xs font-bold ${
            isPaidInFull
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isPaidInFull ? (
              <span className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                PAID IN FULL
              </span>
            ) : (
              <span>PARTIAL PAYMENT — Balance {formatUGX(balanceRemaining)}</span>
            )}
          </div>

          {/* Authorization & Signature */}
          <div className="pt-2 flex justify-between items-end text-xs">
            <div className="text-[11px] text-slate-400">
              CL LODGES AND HOMES / CL APARTMENTS
            </div>
            <div className="text-right">
              <div className="w-32 border-b border-slate-300 mb-1 inline-block" />
              <p className="text-[11px] text-slate-500">Authorized by:</p>
              <p className="font-bold text-slate-800">{property.ownerName || 'Landlord'}</p>
            </div>
          </div>

          {/* Attribution Footer */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">
              Built by NileSites — Professional Digital Solutions for Uganda (nilesites.vercel.app)
            </p>
          </div>
        </div>

        {/* Bottom Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition min-h-[44px]"
          >
            Done • Close Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
};
