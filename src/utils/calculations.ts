import type { Room, Tenant, Payment, TenantBalanceInfo, Expense } from '../types';
import { parseMonthYear, formatMonthYear, getCurrentMonthYear } from './formatters';

export function calculateTenantBalances(
  tenants: Tenant[],
  rooms: Room[],
  payments: Payment[],
  referenceDate: Date = new Date()
): TenantBalanceInfo[] {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const currentMonthStr = formatMonthYear(referenceDate);
  const currentDay = referenceDate.getDate();
  const currentYear = referenceDate.getFullYear();
  const currentMonthIdx = referenceDate.getMonth();

  return tenants.map((tenant) => {
    const room = roomMap.get(tenant.roomId);
    const monthlyRent = tenant.monthlyRent || room?.rentAmount || 0;
    const dueDay = tenant.rentDueDay || 1;

    // Determine months between move-in and current month
    const moveIn = new Date(tenant.moveInDate || referenceDate);
    const moveInYear = moveIn.getFullYear();
    const moveInMonthIdx = moveIn.getMonth();

    // Generate list of active months
    const monthList: string[] = [];
    let y = moveInYear;
    let m = moveInMonthIdx;

    // Safety limit max 60 months
    let safetyCounter = 0;
    while ((y < currentYear || (y === currentYear && m <= currentMonthIdx)) && safetyCounter < 60) {
      safetyCounter++;
      const d = new Date(y, m, 1);
      monthList.push(formatMonthYear(d));
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    if (monthList.length === 0) {
      monthList.push(currentMonthStr);
    }

    // Map payments by periodMonth or fallback to paymentDate's month
    const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
    const paymentsByPeriod = new Map<string, number>();

    for (const p of tenantPayments) {
      const period = p.periodMonth || formatMonthYear(new Date(p.paymentDate));
      paymentsByPeriod.set(period, (paymentsByPeriod.get(period) || 0) + p.amountPaid);
    }

    let totalOwed = 0;
    let totalPaid = 0;
    let totalArrears = 0;

    for (const period of monthList) {
      totalOwed += monthlyRent;
      const paidForPeriod = paymentsByPeriod.get(period) || 0;
      totalPaid += paidForPeriod;

      if (paidForPeriod < monthlyRent) {
        // If it's current month, only consider arrears if due date has passed
        if (period === currentMonthStr) {
          if (currentDay > dueDay) {
            totalArrears += (monthlyRent - paidForPeriod);
          }
        } else {
          totalArrears += (monthlyRent - paidForPeriod);
        }
      }
    }

    const currentMonthPaid = paymentsByPeriod.get(currentMonthStr) || 0;
    const currentMonthDue = monthlyRent;
    const currentMonthShortfall = Math.max(0, currentMonthDue - currentMonthPaid);

    let status: 'PAID' | 'DUE' | 'OVERDUE' = 'PAID';
    let daysOverdue = 0;

    if (tenant.status === 'Active') {
      if (currentMonthPaid >= currentMonthDue && totalArrears === 0) {
        status = 'PAID';
      } else if (currentDay > dueDay || totalArrears > 0) {
        status = 'OVERDUE';
        daysOverdue = Math.max(1, currentDay - dueDay);
      } else {
        status = 'DUE';
      }
    } else {
      status = totalArrears > 0 ? 'OVERDUE' : 'PAID';
    }

    // Due date for current month
    const nextDueDate = `${dueDay} ${currentMonthStr}`;

    return {
      tenant,
      room,
      totalPaid,
      totalOwed,
      currentMonthPaid,
      currentMonthDue,
      currentMonthArrears: currentMonthShortfall,
      totalArrears,
      status,
      daysOverdue,
      nextDueDate,
    };
  });
}

export function getDashboardSummary(
  rooms: Room[],
  tenants: Tenant[],
  payments: Payment[],
  referenceDate: Date = new Date()
) {
  const currentMonthStr = formatMonthYear(referenceDate);
  const currentDay = referenceDate.getDate();

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // This month income
  const thisMonthPayments = payments.filter((p) => {
    return p.periodMonth === currentMonthStr || formatMonthYear(new Date(p.paymentDate)) === currentMonthStr;
  });
  const thisMonthIncome = thisMonthPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  // Balances
  const tenantBalances = calculateTenantBalances(tenants, rooms, payments, referenceDate);
  const activeBalances = tenantBalances.filter((tb) => tb.tenant.status === 'Active');

  const totalArrears = activeBalances.reduce((sum, tb) => sum + tb.totalArrears, 0);

  // Overdue tenants: today past due date and rent unpaid or shortfall
  const overdueTenants = activeBalances.filter((tb) => {
    const dueDay = tb.tenant.rentDueDay || 1;
    const isPastDue = currentDay > dueDay;
    return (isPastDue && tb.currentMonthArrears > 0) || tb.totalArrears > 0;
  });

  // Due soon tenants: rent is due within the next 7 days and not paid yet
  const dueSoonTenants = activeBalances.filter((tb) => {
    const dueDay = tb.tenant.rentDueDay || 1;
    const daysUntilDue = dueDay - currentDay;
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;
    return isDueSoon && tb.currentMonthPaid < tb.currentMonthDue && !overdueTenants.includes(tb);
  });

  // Recent 5 payments
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  return {
    totalRooms,
    occupiedRooms,
    occupancyPercentage,
    thisMonthIncome,
    totalArrears,
    overdueTenants,
    dueSoonTenants,
    recentPayments,
  };
}

export interface MonthlyFinancialSummary {
  periodMonth: string;
  totalRentCollected: number;
  totalExpenses: number;
  netIncome: number;
  marginPercentage: number;
  expensePercentage: number;
  paymentsCount: number;
  expensesCount: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
}

export function getMonthlyFinancialSummary(
  payments: Payment[],
  expenses: Expense[],
  referenceDate: Date = new Date()
): MonthlyFinancialSummary {
  const currentMonthStr = formatMonthYear(referenceDate);

  // Filter payments for current month (by periodMonth or date)
  const monthPayments = payments.filter((p) => {
    if (p.periodMonth === currentMonthStr) return true;
    const d = new Date(p.paymentDate);
    return formatMonthYear(d) === currentMonthStr;
  });

  const totalRentCollected = monthPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  // Filter expenses for current month
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return formatMonthYear(d) === currentMonthStr;
  });

  const totalExpenses = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netIncome = totalRentCollected - totalExpenses;

  const marginPercentage =
    totalRentCollected > 0 ? Math.round((netIncome / totalRentCollected) * 100) : 0;
  const expensePercentage =
    totalRentCollected > 0
      ? Math.min(100, Math.round((totalExpenses / totalRentCollected) * 100))
      : totalExpenses > 0
      ? 100
      : 0;

  // Category breakdown
  const categoryMap: { [cat: string]: number } = {};
  for (const exp of monthExpenses) {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + (exp.amount || 0);
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    periodMonth: currentMonthStr,
    totalRentCollected,
    totalExpenses,
    netIncome,
    marginPercentage,
    expensePercentage,
    paymentsCount: monthPayments.length,
    expensesCount: monthExpenses.length,
    categoryBreakdown,
  };
}
