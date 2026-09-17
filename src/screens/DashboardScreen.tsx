import React from 'react';
import {
  Building,
  Users,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Calendar,
  CreditCard,
  MessageCircle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Plus
} from 'lucide-react';
import type { Property, Room, Tenant, Payment, Expense } from '../types';
import { getDashboardSummary, getMonthlyFinancialSummary } from '../utils/calculations';
import { formatUGX, formatDate, getCurrentMonthYear, getWhatsAppReminderUrl } from '../utils/formatters';

interface DashboardScreenProps {
  property: Property;
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  expenses?: Expense[];
  onOpenRecordPayment: (prefillTenantId?: string) => void;
  onViewReceipt: (payment: Payment) => void;
  onNavigateTab: (tab: 'rooms' | 'tenants' | 'payments' | 'expenses') => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  property,
  rooms,
  tenants,
  payments,
  expenses = [],
  onOpenRecordPayment,
  onViewReceipt,
  onNavigateTab,
}) => {
  const currentMonthYearStr = getCurrentMonthYear();
  const summary = getDashboardSummary(rooms, tenants, payments);
  const financialSummary = getMonthlyFinancialSummary(payments, expenses);

  const handleSendReminder = (tenant: Tenant, amount: number, roomNum: string, dueDate: string) => {
    const url = getWhatsAppReminderUrl({
      phone: tenant.phone,
      tenantName: tenant.fullName,
      amount,
      roomNumber: roomNum,
      dueDateStr: dueDate,
      ownerName: property.ownerName,
    });
    window.open(url, '_blank');
  };

  const getTenantForPayment = (tenantId: string) => tenants.find((t) => t.id === tenantId);
  const getRoomForTenant = (roomId: string) => rooms.find((r) => r.id === roomId);

  return (
    <div className="space-y-6 pb-6">
      {/* Top Section — Property Name + Month/Year */}
      <div className="bg-gradient-to-br from-black via-zinc-950 to-emerald-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-emerald-900/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rental Property</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-white">
              {property.name || 'CL LODGES AND HOMES / CL APARTMENTS'}
            </h1>
            <p className="text-xs text-zinc-300 mt-0.5 font-medium">
              Landlord: <span className="text-emerald-400 font-bold">{property.ownerName}</span> • {property.address || 'Kampala, Uganda'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-950/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-500/30 text-emerald-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold font-heading">{currentMonthYearStr}</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        {/* Card 1: Total Rooms */}
        <button
          type="button"
          onClick={() => onNavigateTab('rooms')}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition active:scale-98"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Rooms</span>
            <div className="w-8 h-8 rounded-xl bg-black text-emerald-400 flex items-center justify-center shadow-xs">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
            {summary.totalRooms}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>View all units</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </p>
        </button>

        {/* Card 2: Occupied Rooms */}
        <button
          type="button"
          onClick={() => onNavigateTab('rooms')}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition active:scale-98"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Occupied</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-heading text-emerald-700">
            {summary.occupiedRooms} <span className="text-sm font-normal text-slate-500">/ {summary.totalRooms} rooms</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {summary.occupancyPercentage}% Occupancy rate
          </p>
        </button>

        {/* Card 3: This Month Income */}
        <button
          type="button"
          onClick={() => onNavigateTab('payments')}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition active:scale-98"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">This Month Income</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summary.thisMonthIncome > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-bold font-heading ${
            summary.thisMonthIncome > 0 ? 'text-emerald-700' : 'text-slate-700'
          }`}>
            {formatUGX(summary.thisMonthIncome)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Collected in {currentMonthYearStr}
          </p>
        </button>

        {/* Card 4: Total Arrears */}
        <button
          type="button"
          onClick={() => onNavigateTab('tenants')}
          className={`text-left p-4 rounded-2xl border transition active:scale-98 shadow-xs ${
            summary.totalArrears > 0
              ? 'bg-red-50/90 border-red-200 hover:border-red-300'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${summary.totalArrears > 0 ? 'text-red-700' : 'text-slate-500'}`}>
              Total Arrears
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summary.totalArrears > 0 ? 'bg-red-200/70 text-red-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-bold font-heading ${
            summary.totalArrears > 0 ? 'text-red-600' : 'text-slate-700'
          }`}>
            {formatUGX(summary.totalArrears)}
          </div>
          <p className={`text-[11px] mt-1 ${summary.totalArrears > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            {summary.overdueTenants.length} tenants with overdue rent
          </p>
        </button>
      </div>

      {/* Occupancy Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <span>Property Occupancy</span>
          <span className="text-emerald-700 font-bold">{summary.occupiedRooms} of {summary.totalRooms} Rooms Occupied ({summary.occupancyPercentage}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, Math.min(100, summary.occupancyPercentage))}%` }}
          />
        </div>
      </div>

      {/* MONTHLY FINANCIAL SUMMARY SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900">
                Monthly Financial Summary
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated rent collected vs operating expenses for <span className="font-semibold text-slate-700">{currentMonthYearStr}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigateTab('expenses')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition"
            >
              <span>Manage Expenses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Core Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Rent Collected */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-800 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Rent Collected</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-heading text-emerald-900 font-amount">
              {formatUGX(financialSummary.totalRentCollected)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              {financialSummary.paymentsCount} {financialSummary.paymentsCount === 1 ? 'payment' : 'payments'} this month
            </div>
          </div>

          {/* Total Operating Expenses */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80">
            <div className="flex items-center justify-between text-rose-800 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Expenses Incurred</span>
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-heading text-rose-900 font-amount">
              {formatUGX(financialSummary.totalExpenses)}
            </div>
            <div className="text-[11px] text-rose-700 font-medium mt-1">
              {financialSummary.expensesCount} {financialSummary.expensesCount === 1 ? 'expense' : 'expenses'} logged
            </div>
          </div>

          {/* Net Cash Flow / Profit */}
          <div className={`p-4 rounded-2xl border ${
            financialSummary.netIncome >= 0
              ? 'bg-zinc-900 text-white border-zinc-800 shadow-xs'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                financialSummary.netIncome >= 0 ? 'text-emerald-400' : 'text-red-700'
              }`}>
                Net Cash Flow
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                financialSummary.netIncome >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-200 text-red-800'
              }`}>
                {financialSummary.netIncome >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-heading font-amount ${
              financialSummary.netIncome >= 0 ? 'text-white' : 'text-red-700'
            }`}>
              {financialSummary.netIncome >= 0 ? '+' : ''}{formatUGX(financialSummary.netIncome)}
            </div>
            <div className={`text-[11px] font-medium mt-1 ${
              financialSummary.netIncome >= 0 ? 'text-zinc-300' : 'text-red-600'
            }`}>
              {financialSummary.totalRentCollected > 0
                ? `${financialSummary.marginPercentage}% net margin retained`
                : 'Awaiting rent collections'}
            </div>
          </div>
        </div>

        {/* Visual Cash Flow Retention Bar */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Net Profit Retained: <strong className="text-emerald-700">{Math.max(0, financialSummary.marginPercentage)}%</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Operating Costs: <strong className="text-rose-700">{financialSummary.expensePercentage}%</strong></span>
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
            {financialSummary.totalRentCollected > 0 || financialSummary.totalExpenses > 0 ? (
              <>
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      0,
                      financialSummary.totalRentCollected > 0
                        ? Math.max(0, 100 - financialSummary.expensePercentage)
                        : 0
                    )}%`,
                  }}
                  title="Net Rent Retained"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      financialSummary.totalRentCollected > 0
                        ? financialSummary.expensePercentage
                        : 100
                    )}%`,
                  }}
                  title="Operating Expenses"
                />
              </>
            ) : (
              <div className="w-full bg-slate-200 h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                No financial transactions recorded this month
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown for Current Month */}
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Expenses Breakdown ({currentMonthYearStr})</span>
            {financialSummary.categoryBreakdown.length > 0 && (
              <span className="text-[11px] text-slate-500 font-normal">
                {financialSummary.categoryBreakdown.length} active {financialSummary.categoryBreakdown.length === 1 ? 'category' : 'categories'}
              </span>
            )}
          </div>

          {financialSummary.categoryBreakdown.length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                No expenses logged for {currentMonthYearStr} yet.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('expenses')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Expense</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {financialSummary.categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.category}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {item.percentage}% of month's expenses
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="text-xs font-bold text-rose-700 font-amount">
                      {formatUGX(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OVERDUE TENANTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <h2 className="text-base font-bold font-heading text-slate-900">
              Overdue Tenants ({summary.overdueTenants.length})
            </h2>
          </div>
          {summary.overdueTenants.length > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
              Action Needed
            </span>
          )}
        </div>

        {summary.overdueTenants.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No Overdue Rent!</p>
            <p className="text-xs text-slate-500 mt-0.5">All active tenants are up to date for this period.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {summary.overdueTenants.map((bal) => {
              const overdueAmount = bal.totalArrears > 0 ? bal.totalArrears : bal.currentMonthArrears;
              const roomName = bal.room ? `${bal.room.number} (${bal.room.type})` : 'Assigned Room';

              return (
                <div
                  key={bal.tenant.id}
                  className="bg-white rounded-2xl p-4 border border-red-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-heading">{bal.tenant.fullName}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {bal.room?.number || 'Room'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Due: {bal.nextDueDate} • Phone: {bal.tenant.phone}
                    </p>
                    <p className="text-xs font-bold text-red-600 font-amount">
                      Overdue: {formatUGX(overdueAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleSendReminder(
                          bal.tenant,
                          overdueAmount,
                          bal.room?.number || 'Room',
                          bal.nextDueDate || 'today'
                        )
                      }
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[44px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send Reminder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenRecordPayment(bal.tenant.id)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[44px]"
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
      </div>

      {/* DUE SOON SECTION (within next 7 days) */}
      {summary.dueSoonTenants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-base font-bold font-heading text-slate-900">
              Due Soon ({summary.dueSoonTenants.length})
            </h2>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Next 7 days
            </span>
          </div>

          <div className="space-y-2.5">
            {summary.dueSoonTenants.map((bal) => (
              <div
                key={bal.tenant.id}
                className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm font-heading">{bal.tenant.fullName}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      {bal.room?.number || 'Room'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900">
                    Rent of <strong className="font-amount">{formatUGX(bal.currentMonthDue)}</strong> due on {bal.nextDueDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenRecordPayment(bal.tenant.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[44px]"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT PAYMENTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold font-heading text-slate-900">Recent Payments</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View all
          </button>
        </div>

        {summary.recentPayments.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No payments recorded yet</p>
            <button
              type="button"
              onClick={() => onOpenRecordPayment()}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
            >
              Record First Payment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {summary.recentPayments.map((pay) => {
              const tenant = getTenantForPayment(pay.tenantId);
              const room = tenant ? getRoomForTenant(tenant.roomId) : undefined;

              return (
                <div
                  key={pay.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm font-heading">
                        {tenant?.fullName || 'Tenant'}
                      </span>
                      {room && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {room.number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{formatDate(pay.paymentDate)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600">{pay.paymentMethod}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-400">{pay.receiptNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-xs sm:text-sm font-amount">
                        +{formatUGX(pay.amountPaid)}
                      </div>
                      <span className="text-[10px] text-slate-400">{pay.periodMonth}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewReceipt(pay)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition min-h-[36px]"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
