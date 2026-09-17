import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Share2,
  Eye,
  Calendar,
  CheckCircle2,
  Trash2,
  FileText,
  ArrowLeft
} from 'lucide-react';
import type { Payment, Tenant, Room, Property, PaymentMethod } from '../types';
import {
  formatUGX,
  formatDate,
  getCurrentMonthYear,
  shiftMonth,
  getWhatsAppReceiptUrl
} from '../utils/formatters';
import { savePayment, deletePayment, getNextReceiptNumber } from '../db/indexedDb';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';

interface PaymentsScreenProps {
  payments: Payment[];
  tenants: Tenant[];
  rooms: Room[];
  property: Property;
  initialSelectedTenantId?: string | null;
  onClearInitialTenantId?: () => void;
  onRefresh: () => void;
  onViewReceipt: (payment: Payment) => void;
  onBackToMenu?: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'MTN Mobile Money',
  'Airtel Money',
  'Bank Transfer',
];

export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({
  payments,
  tenants,
  rooms,
  property,
  initialSelectedTenantId,
  onClearInitialTenantId,
  onRefresh,
  onViewReceipt,
  onBackToMenu,
}) => {
  const { showToast, showSuccess, showError } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Form states
  const [tenantId, setTenantId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(selectedMonth);
  const [amountDue, setAmountDue] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN Mobile Money');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Open modal with pre-selected tenant if triggered externally
  useEffect(() => {
    if (initialSelectedTenantId) {
      openRecordModal(initialSelectedTenantId);
      if (onClearInitialTenantId) onClearInitialTenantId();
    }
  }, [initialSelectedTenantId]);

  const openRecordModal = (preselectedTenantId?: string) => {
    const targetTenantId = preselectedTenantId || (tenants.find((t) => t.status === 'Active')?.id || tenants[0]?.id || '');
    setTenantId(targetTenantId);

    const selTenant = tenants.find((t) => t.id === targetTenantId);
    const rent = selTenant?.monthlyRent || 0;
    setAmountDue(rent);
    setAmountPaid(String(rent));

    setPeriodMonth(selectedMonth);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('MTN Mobile Money');
    setReferenceNumber('');
    setNotes('');
    setIsRecordModalOpen(true);
  };

  const handleTenantChange = (id: string) => {
    setTenantId(id);
    const selTenant = tenants.find((t) => t.id === id);
    const rent = selTenant?.monthlyRent || 0;
    setAmountDue(rent);
    setAmountPaid(String(rent));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !amountPaid || Number(amountPaid) <= 0 || !paymentDate) {
      showError('Please select a tenant, enter a valid amount, and set payment date.');
      return;
    }

    try {
      setIsSaving(true);
      const selTenant = tenants.find((t) => t.id === tenantId);
      const receiptNo = await getNextReceiptNumber();

      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        receiptNumber: receiptNo,
        tenantId,
        roomId: selTenant?.roomId || '',
        amountPaid: Number(amountPaid),
        amountDue,
        periodMonth,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await savePayment(newPayment);
      setIsRecordModalOpen(false);
      onRefresh();

      // Offer two buttons: "View Receipt" | "Share on WhatsApp"
      showToast({
        type: 'success',
        title: 'Payment Recorded',
        message: `Receipt ${receiptNo} generated for ${selTenant?.fullName || 'Tenant'}.`,
        actions: [
          {
            label: 'View Receipt',
            onClick: () => onViewReceipt(newPayment),
            variant: 'primary',
          },
          {
            label: 'Share WhatsApp',
            onClick: () => {
              if (selTenant) {
                const url = getWhatsAppReceiptUrl({
                  tenantPhone: selTenant.phone,
                  tenantName: selTenant.fullName,
                  period: newPayment.periodMonth,
                  amount: newPayment.amountPaid,
                  receiptNo: newPayment.receiptNumber,
                  ownerName: property.ownerName,
                });
                window.open(url, '_blank');
              }
            },
            variant: 'secondary',
          },
        ],
      });
    } catch (err) {
      console.error(err);
      showError('Failed to record payment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
      showSuccess(`Payment receipt ${paymentToDelete.receiptNumber} removed.`);
      setPaymentToDelete(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to delete payment.');
    }
  };

  // Filter payments for selected month
  const monthPayments = useMemo(() => {
    return payments.filter((p) => {
      if (p.periodMonth === selectedMonth) return true;
      // Also match paymentDate's month if periodMonth is missing
      const d = new Date(p.paymentDate);
      const payMonthStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return payMonthStr === selectedMonth;
    });
  }, [payments, selectedMonth]);

  // Month summary calculations
  const totalCollected = useMemo(() => {
    return monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  }, [monthPayments]);

  // Expected rent for all active tenants in that month
  const totalExpected = useMemo(() => {
    return tenants
      .filter((t) => t.status === 'Active')
      .reduce((sum, t) => sum + (t.monthlyRent || 0), 0);
  }, [tenants]);

  const outstanding = Math.max(0, totalExpected - totalCollected);

  // Group payments by date (newest date first)
  const groupedPayments = useMemo(() => {
    const groups: { [dateStr: string]: Payment[] } = {};
    for (const p of monthPayments) {
      const d = p.paymentDate;
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    }
    // Sort keys descending
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedDates.map((date) => ({
      date,
      items: groups[date],
    }));
  }, [monthPayments]);

  const numPaid = Number(amountPaid) || 0;
  const balanceRemaining = Math.max(0, amountDue - numPaid);

  return (
    <div className="space-y-5 pb-6">
      {/* Top Menu Breadcrumb Navigation */}
      {onBackToMenu && (
        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-zinc-700 hover:text-emerald-700 border border-zinc-200/80 shadow-2xs text-xs font-bold transition group min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 transition" />
            <span>← Back to Main Menu</span>
          </button>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
            Payments & Receipts
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">Payments</h1>
          <p className="text-xs text-slate-500">Record rent collections and generate official receipts</p>
        </div>

        <button
          type="button"
          onClick={() => openRecordModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Monthly Selector (← July 2025 →) */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-sm sm:text-base text-slate-900 font-heading">
            {selectedMonth}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month Summary Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div>
          <span className="text-[11px] text-slate-500 block">Total Collected</span>
          <span className="text-sm sm:text-lg font-bold text-emerald-700 font-heading font-amount">
            {formatUGX(totalCollected)}
          </span>
        </div>

        <div className="border-x border-slate-100 px-1">
          <span className="text-[11px] text-slate-500 block">Outstanding</span>
          <span className={`text-sm sm:text-lg font-bold font-heading font-amount ${
            outstanding > 0 ? 'text-red-600' : 'text-slate-800'
          }`}>
            {formatUGX(outstanding)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Payments Count</span>
          <span className="text-sm sm:text-lg font-bold text-slate-800 font-heading">
            {monthPayments.length} recorded
          </span>
        </div>
      </div>

      {/* Payment List for Selected Month, grouped by date */}
      {monthPayments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            No payments for {selectedMonth}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            No rental payments recorded for this period yet.
          </p>
          <button
            type="button"
            onClick={() => openRecordModal()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment for {selectedMonth}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPayments.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-slate-500 font-heading uppercase tracking-wider">
                  {formatDate(group.date)}
                </span>
                <span className="h-px flex-1 bg-slate-200/70" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {group.items.map((payment) => {
                  const tenant = tenants.find((t) => t.id === payment.tenantId);
                  const room = rooms.find((r) => r.id === (payment.roomId || tenant?.roomId));

                  return (
                    <div
                      key={payment.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {payment.receiptNumber}
                          </span>
                          <span className="text-sm font-bold text-slate-900 font-heading">
                            {tenant?.fullName || 'Tenant'}
                          </span>
                          {room && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {room.number}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px]">
                            {payment.paymentMethod}
                          </span>
                          {payment.referenceNumber && (
                            <span className="font-mono text-[11px] text-slate-500">
                              Ref: {payment.referenceNumber}
                            </span>
                          )}
                          <span>•</span>
                          <span>Period: {payment.periodMonth}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-base font-bold text-emerald-700 font-amount block">
                            +{formatUGX(payment.amountPaid)}
                          </span>
                          {payment.amountPaid < payment.amountDue && (
                            <span className="text-[10px] text-red-500 font-medium block">
                              Balance: {formatUGX(payment.amountDue - payment.amountPaid)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(payment)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[40px]"
                            title="View & Share PDF Receipt"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Receipt / PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (tenant) {
                                const url = getWhatsAppReceiptUrl({
                                  tenantPhone: tenant.phone,
                                  tenantName: tenant.fullName,
                                  period: payment.periodMonth,
                                  amount: payment.amountPaid,
                                  receiptNo: payment.receiptNumber,
                                  ownerName: property.ownerName,
                                });
                                window.open(url, '_blank');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 min-h-[40px]"
                            title="Send WhatsApp text summary"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentToDelete(payment)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                            aria-label="Delete payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Rental Payment"
        maxWidth="lg"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div>
            <label htmlFor="paymentTenantSelect" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Tenant <span className="text-red-500">*</span>
            </label>
            <select
              id="paymentTenantSelect"
              required
              value={tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
            >
              <option value="">Choose tenant...</option>
              {tenants.map((t) => {
                const r = rooms.find((rm) => rm.id === t.roomId);
                return (
                  <option key={t.id} value={t.id}>
                    {t.fullName} — Room {r ? r.number : 'None'} ({formatUGX(t.monthlyRent)}/mo)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="periodMonth" className="block text-xs font-semibold text-slate-700 mb-1">
                Period / Month this covers <span className="text-red-500">*</span>
              </label>
              <input
                id="periodMonth"
                type="text"
                required
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                placeholder="e.g. July 2025"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Default: {selectedMonth}</span>
            </div>

            <div>
              <label htmlFor="paymentDate" className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                id="paymentDate"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amountDue" className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Due (UGX) <span className="text-xs text-slate-400">(Read-only)</span>
              </label>
              <input
                id="amountDue"
                type="text"
                readOnly
                value={formatUGX(amountDue)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="amountPaid" className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid (UGX) <span className="text-red-500">*</span>
              </label>
              <input
                id="amountPaid"
                type="number"
                required
                min="1000"
                step="1000"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="e.g. 350000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-sm focus:border-emerald-600 min-h-[44px]"
              />
              {amountPaid && (
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                  {formatUGX(Number(amountPaid))}
                </span>
              )}
            </div>
          </div>

          {/* Arrears note if partial payment */}
          {numPaid < amountDue && numPaid > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>Partial payment:</strong> Balance remaining: <span className="font-bold font-amount">{formatUGX(balanceRemaining)}</span>. Will be recorded as shortfall.
            </div>
          )}

          <div>
            <label htmlFor="paymentMethod" className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition text-center min-h-[42px] ${
                    paymentMethod === method
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="paymentRef" className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Reference (Optional)
            </label>
            <input
              id="paymentRef"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. MTN ref 1234567890 or Bank Ref"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="paymentNotes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="paymentNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in cash at reception"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 min-h-[44px]"
            >
              {isSaving ? 'Recording...' : 'Record & Generate Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
        title="Delete Payment Record?"
        message={`Are you sure you want to delete receipt ${paymentToDelete?.receiptNumber}?`}
        confirmText="Delete Payment"
      />
    </div>
  );
};
