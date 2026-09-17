import React, { useState, useEffect, useCallback } from 'react';
import type { Property, Room, Tenant, Payment, Expense } from './types';
import {
  getProperty,
  getRooms,
  getTenants,
  getPayments,
  getExpenses,
} from './db/indexedDb';
import { ToastProvider } from './components/Toast';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SetupScreen } from './components/SetupScreen';
import { Navigation, type NavTab } from './components/Navigation';
import { ReceiptModal } from './components/ReceiptModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { TenantsScreen } from './screens/TenantsScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Building, Plus, Loader2 } from 'lucide-react';

export function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Inter-screen workflow states
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);
  const [prefilledPaymentTenantId, setPrefilledPaymentTenantId] = useState<string | null>(null);
  const [preselectedRoomIdForTenant, setPreselectedRoomIdForTenant] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      const [propData, roomsData, tenantsData, paymentsData, expensesData] = await Promise.all([
        getProperty(),
        getRooms(),
        getTenants(),
        getPayments(),
        getExpenses(),
      ]);
      setProperty(propData || null);
      setRooms(roomsData);
      setTenants(tenantsData);
      setPayments(paymentsData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Failed to load data from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleOpenRecordPayment = (tenantId?: string) => {
    if (tenantId) {
      setPrefilledPaymentTenantId(tenantId);
    }
    setCurrentTab('payments');
  };

  const handleAssignTenantToRoom = (roomId: string) => {
    setPreselectedRoomIdForTenant(roomId);
    setCurrentTab('tenants');
  };

  const handleViewReceipt = (payment: Payment) => {
    setActiveReceiptPayment(payment);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold tracking-wide text-zinc-300">Loading CL LODGES & HOMES / APARTMENTS...</p>
      </div>
    );
  }

  // First-launch experience: show setup screen if no property exists
  if (!property) {
    return <SetupScreen onComplete={loadAllData} />;
  }

  // Find tenant and room for active receipt modal
  const receiptTenant = activeReceiptPayment
    ? tenants.find((t) => t.id === activeReceiptPayment.tenantId)
    : undefined;
  const receiptRoom = receiptTenant
    ? rooms.find((r) => r.id === (activeReceiptPayment?.roomId || receiptTenant.roomId))
    : undefined;

  // Active tenants with overdue rent for badge
  const overdueTenantsCount = tenants.filter((t) => {
    if (t.status !== 'Active') return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDay = t.rentDueDay || 1;
    const isPastDue = now.getDate() >= dueDay;

    const hasPaidCurrent = payments.some((p) => {
      if (p.tenantId !== t.id) return false;
      const d = new Date(p.paymentDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    return isPastDue && !hasPaidCurrent;
  }).length;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 selection:bg-emerald-600 selection:text-white">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Top Mobile Bar */}
      <div className="md:hidden sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm font-heading leading-tight block text-white truncate max-w-[200px] sm:max-w-xs">
              {property.name || 'CL LODGES AND HOMES / CL APARTMENTS'}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              {property.ownerName || 'Sendagire Razak'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenRecordPayment()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pay</span>
        </button>
      </div>

      {/* Desktop Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onQuickRecordPayment={() => handleOpenRecordPayment()}
        arrearsCount={overdueTenantsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-20 md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardScreen
            property={property}
            rooms={rooms}
            tenants={tenants}
            payments={payments}
            onOpenRecordPayment={handleOpenRecordPayment}
            onViewReceipt={handleViewReceipt}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'rooms' && (
          <RoomsScreen
            rooms={rooms}
            tenants={tenants}
            onRefresh={loadAllData}
            onAssignTenantToRoom={handleAssignTenantToRoom}
          />
        )}

        {currentTab === 'tenants' && (
          <TenantsScreen
            tenants={tenants}
            rooms={rooms}
            payments={payments}
            property={property}
            preselectedRoomId={preselectedRoomIdForTenant}
            onClearPreselectedRoomId={() => setPreselectedRoomIdForTenant(null)}
            onRefresh={loadAllData}
            onOpenRecordPayment={handleOpenRecordPayment}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsScreen
            payments={payments}
            tenants={tenants}
            rooms={rooms}
            property={property}
            initialSelectedTenantId={prefilledPaymentTenantId}
            onClearInitialTenantId={() => setPrefilledPaymentTenantId(null)}
            onRefresh={loadAllData}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesScreen
            expenses={expenses}
            payments={payments}
            rooms={rooms}
            onRefresh={loadAllData}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            property={property}
            onRefresh={loadAllData}
          />
        )}
      </main>

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Receipt Modal (when viewing or after recording) */}
      {activeReceiptPayment && receiptTenant && property && (
        <ReceiptModal
          isOpen={!!activeReceiptPayment}
          onClose={() => setActiveReceiptPayment(null)}
          property={property}
          tenant={receiptTenant}
          room={receiptRoom}
          payment={activeReceiptPayment}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
