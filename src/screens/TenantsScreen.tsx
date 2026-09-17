import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  User,
  CreditCard,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import type { Tenant, Room, Payment, Property, TenantStatus } from '../types';
import { calculateTenantBalances } from '../utils/calculations';
import { formatUGX, formatDate, getWhatsAppReminderUrl } from '../utils/formatters';
import { saveTenant, deleteTenant } from '../db/indexedDb';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';

interface TenantsScreenProps {
  tenants: Tenant[];
  rooms: Room[];
  payments: Payment[];
  property: Property;
  preselectedRoomId?: string | null;
  onClearPreselectedRoomId?: () => void;
  onRefresh: () => void;
  onOpenRecordPayment: (tenantId: string) => void;
  onViewReceipt: (payment: Payment) => void;
  onBackToMenu?: () => void;
}

export const TenantsScreen: React.FC<TenantsScreenProps> = ({
  tenants,
  rooms,
  payments,
  property,
  preselectedRoomId,
  onClearPreselectedRoomId,
  onRefresh,
  onOpenRecordPayment,
  onViewReceipt,
  onBackToMenu,
}) => {
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Active' | 'Vacated'>('Active');
  
  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [rentDueDay, setRentDueDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TenantStatus>('Active');

  // Handle trigger to assign tenant to room from Rooms tab
  useEffect(() => {
    if (preselectedRoomId) {
      openAddModal(preselectedRoomId);
      if (onClearPreselectedRoomId) onClearPreselectedRoomId();
    }
  }, [preselectedRoomId]);

  const balances = useMemo(() => {
    return calculateTenantBalances(tenants, rooms, payments);
  }, [tenants, rooms, payments]);

  const balanceMap = useMemo(() => {
    return new Map(balances.map((b) => [b.tenant.id, b]));
  }, [balances]);

  const openAddModal = (presetRoomId?: string) => {
    setEditingTenant(null);
    setFullName('');
    setPhone('');
    setPhone2('');
    setNationalId('');
    
    const targetRoomId = presetRoomId || (rooms.find((r) => r.status === 'Vacant')?.id || rooms[0]?.id || '');
    setRoomId(targetRoomId);

    const initialRoom = rooms.find((r) => r.id === targetRoomId);
    setMonthlyRent(initialRoom ? String(initialRoom.rentAmount) : '');
    setDepositPaid(initialRoom ? String(initialRoom.rentAmount) : '0');
    
    const todayStr = new Date().toISOString().split('T')[0];
    setMoveInDate(todayStr);
    setLeaseEndDate('');
    setRentDueDay(1);
    setNotes('');
    setStatus('Active');
    setIsAddEditOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setFullName(t.fullName);
    setPhone(t.phone);
    setPhone2(t.phone2 || '');
    setNationalId(t.nationalId || '');
    setRoomId(t.roomId);
    setMonthlyRent(String(t.monthlyRent));
    setDepositPaid(String(t.depositPaid || 0));
    setMoveInDate(t.moveInDate);
    setLeaseEndDate(t.leaseEndDate || '');
    setRentDueDay(t.rentDueDay || 1);
    setNotes(t.notes || '');
    setStatus(t.status);
    setIsAddEditOpen(true);
  };

  const handleRoomChange = (selectedRoomId: string) => {
    setRoomId(selectedRoomId);
    const selRoom = rooms.find((r) => r.id === selectedRoomId);
    if (selRoom && (!monthlyRent || monthlyRent === '0')) {
      setMonthlyRent(String(selRoom.rentAmount));
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !roomId || !moveInDate || !monthlyRent) {
      showError('Please fill all required fields (*).');
      return;
    }

    try {
      const tenant: Tenant = {
        id: editingTenant ? editingTenant.id : `tenant-${Date.now()}`,
        fullName: fullName.trim(),
        phone: phone.trim(),
        phone2: phone2.trim() || undefined,
        nationalId: nationalId.trim() || undefined,
        roomId,
        monthlyRent: Number(monthlyRent),
        depositPaid: Number(depositPaid) || 0,
        moveInDate,
        leaseEndDate: leaseEndDate || undefined,
        rentDueDay: Number(rentDueDay) || 1,
        notes: notes.trim() || undefined,
        status,
        createdAt: editingTenant ? editingTenant.createdAt : new Date().toISOString(),
      };

      await saveTenant(tenant);
      showSuccess(editingTenant ? `${tenant.fullName} updated.` : `${tenant.fullName} added successfully.`);
      setIsAddEditOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to save tenant.');
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      await deleteTenant(tenantToDelete.id);
      showSuccess(`${tenantToDelete.fullName} removed.`);
      setTenantToDelete(null);
      if (viewingTenant?.id === tenantToDelete.id) {
        setViewingTenant(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to remove tenant.');
    }
  };

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Tab filter
      if (filterTab === 'Active' && t.status !== 'Active') return false;
      if (filterTab === 'Vacated' && t.status !== 'Vacated') return false;

      // Search query filter (by name or room number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const room = rooms.find((r) => r.id === t.roomId);
        const nameMatch = t.fullName.toLowerCase().includes(q);
        const roomMatch = room ? room.number.toLowerCase().includes(q) : false;
        const phoneMatch = t.phone.toLowerCase().includes(q);
        return nameMatch || roomMatch || phoneMatch;
      }
      return true;
    });
  }, [tenants, filterTab, searchQuery, rooms]);

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
            Tenants Directory
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">Tenants</h1>
          <p className="text-xs text-slate-500">Track occupant records, rent status and arrears</p>
        </div>

        <button
          type="button"
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by tenant name, room number, or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
        />
      </div>

      {/* Filter Tabs: All | Active | Vacated */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {(['All', 'Active', 'Vacated'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition min-h-[38px] ${
              filterTab === tab
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab} (
            {tab === 'All'
              ? tenants.length
              : tenants.filter((t) => t.status === tab).length}
            )
          </button>
        ))}
      </div>

      {/* Tenant Cards List */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            {tenants.length === 0 ? 'No tenants yet' : 'No matching tenants found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {tenants.length === 0
              ? 'Assign your first tenant to a room to start tracking payments.'
              : 'Try clearing your search query or switching tabs.'}
          </p>
          {tenants.length === 0 && (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Tenant</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => {
            const room = rooms.find((r) => r.id === tenant.roomId);
            const balInfo = balanceMap.get(tenant.id);

            return (
              <div
                key={tenant.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3 cursor-pointer"
                onClick={() => setViewingTenant(tenant)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base font-heading">
                        {tenant.fullName}
                      </span>
                      {tenant.status === 'Vacated' && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Vacated
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {room ? (
                        <span className="font-medium text-slate-700">
                          {room.number} • {room.type}
                        </span>
                      ) : (
                        <span>No Room Assigned</span>
                      )}
                      <span className="mx-1.5">•</span>
                      <span>Tel: {tenant.phone}</span>
                    </div>
                  </div>

                  {/* Balance Badge */}
                  {balInfo && (
                    <div>
                      {balInfo.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PAID
                        </span>
                      )}
                      {balInfo.status === 'DUE' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-amount">
                          {formatUGX(balInfo.currentMonthDue)} DUE
                        </span>
                      )}
                      {balInfo.status === 'OVERDUE' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-amount">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          {formatUGX(balInfo.totalArrears > 0 ? balInfo.totalArrears : balInfo.currentMonthArrears)} OVERDUE
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Monthly Rent</span>
                    <span className="font-bold text-slate-800 font-amount">
                      {formatUGX(tenant.monthlyRent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Move-in Date</span>
                    <span className="font-medium text-slate-700">
                      {formatDate(tenant.moveInDate)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setViewingTenant(tenant)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[38px]"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(tenant)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[38px]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenRecordPayment(tenant.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 min-h-[38px]"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TENANT DETAIL VIEW MODAL */}
      {viewingTenant && (
        <Modal
          isOpen={!!viewingTenant}
          onClose={() => setViewingTenant(null)}
          title={viewingTenant.fullName}
          maxWidth="lg"
        >
          {(() => {
            const room = rooms.find((r) => r.id === viewingTenant.roomId);
            const bal = balanceMap.get(viewingTenant.id);
            const tenantPayments = payments
              .filter((p) => p.tenantId === viewingTenant.id)
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

            return (
              <div className="space-y-5">
                {/* Balance Summary Header */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Total Paid</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 font-amount">
                      {formatUGX(bal?.totalPaid || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Total Expected</span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 font-amount">
                      {formatUGX(bal?.totalOwed || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Current Arrears</span>
                    <span className={`text-sm sm:text-base font-bold font-amount ${
                      (bal?.totalArrears || 0) > 0 ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {formatUGX(bal?.totalArrears || 0)}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingTenant(null);
                      onOpenRecordPayment(viewingTenant.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 min-h-[44px]"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = getWhatsAppReminderUrl({
                        phone: viewingTenant.phone,
                        tenantName: viewingTenant.fullName,
                        amount: bal?.totalArrears || bal?.currentMonthDue || viewingTenant.monthlyRent,
                        roomNumber: room?.number || 'Room',
                        dueDateStr: bal?.nextDueDate || 'due date',
                        ownerName: property.ownerName,
                      });
                      window.open(url, '_blank');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send WhatsApp Reminder</span>
                  </button>
                </div>

                {/* Tenant Information Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Occupancy & Contact Details
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                    <div>
                      <span className="text-slate-400 block">Assigned Unit:</span>
                      <span className="font-bold text-slate-800">
                        {room ? `${room.number} — ${room.type}` : 'None'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Monthly Rent:</span>
                      <span className="font-bold text-emerald-700 font-amount">
                        {formatUGX(viewingTenant.monthlyRent)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Primary WhatsApp Phone:</span>
                      <span className="font-medium text-slate-800">{viewingTenant.phone}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Secondary Phone:</span>
                      <span className="font-medium text-slate-800">{viewingTenant.phone2 || 'None'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">National ID (NIN):</span>
                      <span className="font-medium text-slate-800">{viewingTenant.nationalId || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Deposit Paid:</span>
                      <span className="font-medium text-slate-800 font-amount">
                        {formatUGX(viewingTenant.depositPaid)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Move-in Date:</span>
                      <span className="font-medium text-slate-800">{formatDate(viewingTenant.moveInDate)}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Rent Due Day:</span>
                      <span className="font-medium text-slate-800">
                        Day {viewingTenant.rentDueDay} of every month
                      </span>
                    </div>
                  </div>

                  {viewingTenant.notes && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block">Notes:</span>
                      <p className="text-slate-700 mt-0.5">{viewingTenant.notes}</p>
                    </div>
                  )}
                </div>

                {/* Payment History Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Payment History ({tenantPayments.length})
                  </h4>

                  {tenantPayments.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      No payments recorded for this tenant yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {tenantPayments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{p.periodMonth}</span>
                              <span className="text-[10px] font-mono text-slate-400">{p.receiptNumber}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {formatDate(p.paymentDate)} • {p.paymentMethod}
                              {p.referenceNumber && ` (${p.referenceNumber})`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-bold text-emerald-700 font-amount block">
                                {formatUGX(p.amountPaid)}
                              </span>
                              {p.amountPaid < p.amountDue && (
                                <span className="text-[10px] text-red-500 font-amount">
                                  Shortfall: {formatUGX(p.amountDue - p.amountPaid)}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onViewReceipt(p)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                              Receipt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTenantToDelete(viewingTenant);
                    }}
                    className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Tenant Record</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const t = viewingTenant;
                      setViewingTenant(null);
                      openEditModal(t);
                    }}
                    className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold hover:underline"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ADD / EDIT TENANT MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingTenant ? `Edit ${editingTenant.fullName}` : 'Add New Tenant'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTenant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenantFullName" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="tenantFullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Brian Mukasa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="tenantPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone (WhatsApp) <span className="text-red-500">*</span>
              </label>
              <input
                id="tenantPhone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0778 123 456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="tenantPhone2" className="block text-xs font-semibold text-slate-700 mb-1">
                Secondary Phone (Optional)
              </label>
              <input
                id="tenantPhone2"
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="e.g. 0702 987 654"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="tenantNationalId" className="block text-xs font-semibold text-slate-700 mb-1">
                National ID / NIN (Optional)
              </label>
              <input
                id="tenantNationalId"
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="e.g. CM920141029KLM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tenantRoomSelect" className="block text-xs font-semibold text-slate-700 mb-1">
              Assign Room <span className="text-red-500">*</span>
            </label>
            <select
              id="tenantRoomSelect"
              required
              value={roomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
            >
              <option value="">Select a room...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} — {r.type} ({formatUGX(r.rentAmount)}/mo) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenantMonthlyRent" className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Rent (UGX) <span className="text-red-500">*</span>
              </label>
              <input
                id="tenantMonthlyRent"
                type="number"
                required
                min="0"
                step="1000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="350000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
              {monthlyRent && (
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                  {formatUGX(Number(monthlyRent))}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="tenantDepositPaid" className="block text-xs font-semibold text-slate-700 mb-1">
                Security Deposit Paid (UGX)
              </label>
              <input
                id="tenantDepositPaid"
                type="number"
                min="0"
                step="1000"
                value={depositPaid}
                onChange={(e) => setDepositPaid(e.target.value)}
                placeholder="350000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tenantMoveInDate" className="block text-xs font-semibold text-slate-700 mb-1">
                Move-In Date <span className="text-red-500">*</span>
              </label>
              <input
                id="tenantMoveInDate"
                type="date"
                required
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="tenantLeaseEndDate" className="block text-xs font-semibold text-slate-700 mb-1">
                Lease End Date (Optional)
              </label>
              <input
                id="tenantLeaseEndDate"
                type="date"
                value={leaseEndDate}
                onChange={(e) => setLeaseEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="tenantRentDueDay" className="block text-xs font-semibold text-slate-700 mb-1">
                Rent Due Day (1–28) <span className="text-red-500">*</span>
              </label>
              <select
                id="tenantRentDueDay"
                value={rentDueDay}
                onChange={(e) => setRentDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    Day {day} of the month
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tenantStatus" className="block text-xs font-semibold text-slate-700 mb-1">
              Tenant Status <span className="text-red-500">*</span>
            </label>
            <select
              id="tenantStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as TenantStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
            >
              <option value="Active">Active (Currently Living Here)</option>
              <option value="Vacated">Vacated (Moved Out)</option>
            </select>
          </div>

          <div>
            <label htmlFor="tenantNotes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              id="tenantNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Works at bank, pays via MTN Mobile Money"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
            >
              {editingTenant ? 'Save Changes' : 'Add Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        onConfirm={handleDeleteTenant}
        title="Delete Tenant?"
        message={`Are you sure you want to delete ${tenantToDelete?.fullName}? All balance and assignment records for this tenant will be removed.`}
        confirmText="Delete Tenant"
      />
    </div>
  );
};
