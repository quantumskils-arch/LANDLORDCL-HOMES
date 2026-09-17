import React, { useState, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import type { Expense, Payment, Room, ExpenseCategory } from '../types';
import {
  formatUGX,
  formatDate,
  getCurrentMonthYear,
  shiftMonth
} from '../utils/formatters';
import { saveExpense, deleteExpense } from '../db/indexedDb';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';

interface ExpensesScreenProps {
  expenses: Expense[];
  payments: Payment[];
  rooms: Room[];
  onRefresh: () => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Umeme / Electricity',
  'NWSC / Water',
  'Repairs / Maintenance',
  'Cleaning / Compound',
  'Security / Askaris',
  'Garbage Collection',
  'Taxes / Trading Licence',
  'Other',
];

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  expenses,
  payments,
  rooms,
  onRefresh,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>('Repairs / Maintenance');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setCategory('Repairs / Maintenance');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setRoomId('');
    setDescription('');
    setReceiptNumber('');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description.trim() || !date) {
      showError('Please enter an amount, description, and expense date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        category,
        amount: Number(amount),
        date,
        roomId: roomId || undefined,
        description: description.trim(),
        receiptNumber: receiptNumber.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveExpense(newExpense);
      showSuccess(`Expense for ${formatUGX(newExpense.amount)} recorded.`);
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete.id);
      showSuccess('Expense entry removed.');
      setExpenseToDelete(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to delete expense.');
    }
  };

  // Filter expenses for selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      const expMonthStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return expMonthStr === selectedMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedMonth]);

  // Filter payments for selected month to calculate Net Income
  const monthPayments = useMemo(() => {
    return payments.filter((p) => {
      if (p.periodMonth === selectedMonth) return true;
      const d = new Date(p.paymentDate);
      const payMonthStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return payMonthStr === selectedMonth;
    });
  }, [payments, selectedMonth]);

  const totalIncome = useMemo(() => {
    return monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  }, [monthPayments]);

  const totalExpenses = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthExpenses]);

  const netIncome = totalIncome - totalExpenses;

  // Breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map: { [cat: string]: number } = {};
    for (const exp of monthExpenses) {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    }
    return Object.entries(map)
      .map(([cat, amt]) => ({ category: cat, amount: amt }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">Expenses</h1>
          <p className="text-xs text-slate-500">Track property operating costs and net profits</p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Monthly Selector */}
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

      {/* Financial Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Financial Summary ({selectedMonth})
        </h2>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Total Income</span>
            <span className="text-sm sm:text-lg font-bold text-emerald-700 font-amount block mt-0.5">
              +{formatUGX(totalIncome)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-500 block">Total Expenses</span>
            <span className="text-sm sm:text-lg font-bold text-red-600 font-amount block mt-0.5">
              -{formatUGX(totalExpenses)}
            </span>
          </div>

          <div className={`p-3 rounded-xl ${netIncome >= 0 ? 'bg-emerald-50/80' : 'bg-red-50/80'}`}>
            <span className="text-[11px] text-slate-600 block font-medium">Net Profit</span>
            <span className={`text-sm sm:text-lg font-bold font-amount block mt-0.5 ${
              netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {formatUGX(netIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Expense Breakdown by Category */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Spending by Category
          </h2>

          <div className="space-y-2.5 pt-1">
            {categoryBreakdown.map((item) => {
              const pct = totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.category}</span>
                    <span className="font-bold text-slate-800 font-amount">
                      {formatUGX(item.amount)} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-heading text-slate-900">
            Recorded Expenses ({monthExpenses.length})
          </h2>
        </div>

        {monthExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 font-heading">
              No expenses recorded for {selectedMonth}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Keep your financial records accurate by adding utility bills and maintenance expenses.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {monthExpenses.map((expense) => {
              const room = rooms.find((r) => r.id === expense.roomId);

              return (
                <div
                  key={expense.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {expense.category}
                      </span>
                      {room ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Room {room.number}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Whole Property</span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-800 font-heading">
                      {expense.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(expense.date)}</span>
                      {expense.receiptNumber && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px]">Invoice: {expense.receiptNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-base font-bold text-red-600 font-amount">
                      -{formatUGX(expense.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(expense)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Expense"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label htmlFor="expenseCategory" className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Category <span className="text-red-500">*</span>
            </label>
            <select
              id="expenseCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expenseAmount" className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (UGX) <span className="text-red-500">*</span>
            </label>
            <input
              id="expenseAmount"
              type="number"
              required
              min="500"
              step="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
            {amount && !isNaN(Number(amount)) && (
              <span className="text-xs text-red-600 font-semibold mt-1 block">
                {formatUGX(Number(amount))}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="expenseDate" className="block text-xs font-semibold text-slate-700 mb-1">
              Date Incurred <span className="text-red-500">*</span>
            </label>
            <input
              id="expenseDate"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="expenseRoom" className="block text-xs font-semibold text-slate-700 mb-1">
              Applicable Room / Unit
            </label>
            <select
              id="expenseRoom"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px] bg-white"
            >
              <option value="">Whole Property (General)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} ({r.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expenseDescription" className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="expenseDescription"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fixed plumbing leak in Room 3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="expenseReceiptNumber" className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt / Invoice / Reference Number (Optional)
            </label>
            <input
              id="expenseReceiptNumber"
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="e.g. INV-9842 or UMEME token ref"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
            >
              {isSubmitting ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense Entry?"
        message={`Are you sure you want to delete this ${formatUGX(expenseToDelete?.amount || 0)} expense entry?`}
        confirmText="Delete Expense"
      />
    </div>
  );
};
