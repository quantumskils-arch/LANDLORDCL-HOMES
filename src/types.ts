export type RoomType =
  | 'Single Room'
  | 'Double Room'
  | 'Self-Contained Single'
  | 'Self-Contained Double'
  | 'Bedsitter';

export type RoomStatus = 'Occupied' | 'Vacant' | 'Maintenance';

export type TenantStatus = 'Active' | 'Vacated';

export type PaymentMethod =
  | 'Cash'
  | 'MTN Mobile Money'
  | 'Airtel Money'
  | 'Bank Transfer';

export type ExpenseCategory =
  | 'Umeme / Electricity'
  | 'NWSC / Water'
  | 'Repairs / Maintenance'
  | 'Cleaning / Compound'
  | 'Security / Askaris'
  | 'Garbage Collection'
  | 'Taxes / Trading Licence'
  | 'Other';

export interface Property {
  id: 'property';
  name: string;        // e.g. "CL LODGES AND HOMES / CL APARTMENTS"
  ownerName: string;   // landlord full name
  ownerPhone: string;  // landlord phone number
  address: string;     // physical address
  lastReceiptNumber?: number; // for RCT-YYYY-XXXX generation
  createdAt: string;   // ISO date string
}

export interface Room {
  id: string;             // uuid
  number: string;         // e.g. "A1", "Room 3", "Unit 5"
  type: RoomType;
  rentAmount: number;     // monthly rent in UGX
  description?: string;   // optional notes
  status: RoomStatus;
  createdAt: string;
}

export interface Tenant {
  id: string;             // uuid
  fullName: string;
  phone: string;          // primary phone (for WhatsApp receipt sharing)
  phone2?: string;        // optional secondary contact
  nationalId?: string;    // optional NIN
  roomId: string;         // foreign key to Room
  monthlyRent: number;    // copied from room, can be overridden
  depositPaid: number;    // security deposit amount
  moveInDate: string;     // YYYY-MM-DD
  leaseEndDate?: string;  // optional lease end
  rentDueDay: number;     // day of month rent is due (1–28), default 1
  notes?: string;
  status: TenantStatus;
  createdAt: string;
}

export interface Payment {
  id: string;             // uuid
  receiptNumber: string;  // auto-generated: "RCT-2025-0001"
  tenantId: string;
  roomId: string;
  amountPaid: number;
  amountDue: number;      // what was owed for that period
  periodMonth: string;    // e.g. "July 2025" — month this payment covers
  paymentDate: string;    // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // mobile money transaction ID or bank ref
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;             // uuid
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;           // YYYY-MM-DD
  roomId?: string;        // optional — which room this expense relates to
  receiptNumber?: string; // invoice or receipt ref
  notes?: string;
  createdAt: string;
}

export interface TenantBalanceInfo {
  tenant: Tenant;
  room?: Room;
  totalPaid: number;
  totalOwed: number;
  currentMonthPaid: number;
  currentMonthDue: number;
  currentMonthArrears: number;
  totalArrears: number;
  status: 'PAID' | 'DUE' | 'OVERDUE';
  daysOverdue?: number;
  nextDueDate?: string;
}

export type TabType = 'dashboard' | 'rooms' | 'tenants' | 'payments' | 'expenses' | 'settings';
