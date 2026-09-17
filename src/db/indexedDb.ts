import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Property, Room, Tenant, Payment, Expense } from '../types';

interface RentFlowDB extends DBSchema {
  property: {
    key: string;
    value: Property;
  };
  rooms: {
    key: string;
    value: Room;
    indexes: { 'by-number': string; 'by-status': string };
  };
  tenants: {
    key: string;
    value: Tenant;
    indexes: { 'by-room': string; 'by-status': string };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { 'by-tenant': string; 'by-period': string; 'by-date': string };
  };
  expenses: {
    key: string;
    value: Expense;
    indexes: { 'by-category': string; 'by-date': string };
  };
}

const DB_NAME = 'rentflow';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RentFlowDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<RentFlowDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RentFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('property')) {
          db.createObjectStore('property', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('rooms')) {
          const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
          roomStore.createIndex('by-number', 'number');
          roomStore.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('tenants')) {
          const tenantStore = db.createObjectStore('tenants', { keyPath: 'id' });
          tenantStore.createIndex('by-room', 'roomId');
          tenantStore.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('payments')) {
          const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentStore.createIndex('by-tenant', 'tenantId');
          paymentStore.createIndex('by-period', 'periodMonth');
          paymentStore.createIndex('by-date', 'paymentDate');
        }
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('by-category', 'category');
          expenseStore.createIndex('by-date', 'date');
        }
      },
    });
  }
  return dbPromise;
}

// Property methods
export async function getProperty(): Promise<Property | undefined> {
  const db = await getDB();
  const prop = await db.get('property', 'property');
  if (prop) {
    let modified = false;
    // Ensure owner name and contact match Sendagire Razak
    if (prop.ownerName !== 'Sendagire Razak') {
      prop.ownerName = 'Sendagire Razak';
      modified = true;
    }
    if (prop.ownerPhone !== '0778030847 / 0778006886' && prop.ownerPhone !== '0778030847/0778006886') {
      prop.ownerPhone = '0778030847 / 0778006886';
      modified = true;
    }
    if (!prop.name || prop.name === 'Sendagire Apartments' || prop.name === 'Sendagire Rentals' || prop.name === 'Kiggundu Apartments' || prop.name === 'RentFlow UG' || prop.name === 'RentFlow Property' || prop.name === 'RentFlow Rental Property') {
      prop.name = 'CL LODGES AND HOMES / CL APARTMENTS';
      modified = true;
    }
    if (modified) {
      await db.put('property', prop);
    }
  }
  return prop;
}

export async function saveProperty(property: Property): Promise<void> {
  const db = await getDB();
  await db.put('property', property);
}

// Receipt Number Generator
export async function getNextReceiptNumber(): Promise<string> {
  const db = await getDB();
  const tx = db.transaction('property', 'readwrite');
  const store = tx.objectStore('property');
  let prop = await store.get('property');
  
  const currentYear = new Date().getFullYear();
  let nextNum = 1;

  if (prop) {
    nextNum = (prop.lastReceiptNumber || 0) + 1;
    prop.lastReceiptNumber = nextNum;
    await store.put(prop);
  } else {
    // If no property record yet, create standard placeholder
    const newProp: Property = {
      id: 'property',
      name: 'CL LODGES AND HOMES / CL APARTMENTS',
      ownerName: 'Sendagire Razak',
      ownerPhone: '0778030847 / 0778006886',
      address: 'Kampala, Uganda',
      lastReceiptNumber: 1,
      createdAt: new Date().toISOString(),
    };
    await store.put(newProp);
  }
  await tx.done;

  const padded = String(nextNum).padStart(4, '0');
  return `RCT-${currentYear}-${padded}`;
}

// Rooms methods
export async function getRooms(): Promise<Room[]> {
  const db = await getDB();
  return db.getAll('rooms');
}

export async function getRoom(id: string): Promise<Room | undefined> {
  const db = await getDB();
  return db.get('rooms', id);
}

export async function saveRoom(room: Room): Promise<void> {
  const db = await getDB();
  await db.put('rooms', room);
}

export async function deleteRoom(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('rooms', id);
}

// Tenants methods
export async function getTenants(): Promise<Tenant[]> {
  const db = await getDB();
  return db.getAll('tenants');
}

export async function getTenant(id: string): Promise<Tenant | undefined> {
  const db = await getDB();
  return db.get('tenants', id);
}

export async function saveTenant(tenant: Tenant): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['tenants', 'rooms'], 'readwrite');
  await tx.objectStore('tenants').put(tenant);

  // Auto update room status:
  // When tenant is active -> room is Occupied
  // When tenant is vacated -> room is Vacant (unless another active tenant exists)
  if (tenant.roomId) {
    const room = await tx.objectStore('rooms').get(tenant.roomId);
    if (room) {
      if (tenant.status === 'Active') {
        room.status = 'Occupied';
        await tx.objectStore('rooms').put(room);
      } else if (tenant.status === 'Vacated') {
        // check if other active tenants are in this room
        const allTenants = await tx.objectStore('tenants').getAll();
        const otherActive = allTenants.some(
          (t) => t.id !== tenant.id && t.roomId === tenant.roomId && t.status === 'Active'
        );
        if (!otherActive) {
          room.status = 'Vacant';
          await tx.objectStore('rooms').put(room);
        }
      }
    }
  }

  await tx.done;
}

export async function deleteTenant(id: string): Promise<void> {
  const db = await getDB();
  const tenant = await db.get('tenants', id);
  if (tenant && tenant.roomId) {
    const room = await db.get('rooms', tenant.roomId);
    if (room && room.status === 'Occupied') {
      const allTenants = await db.getAll('tenants');
      const otherActive = allTenants.some(
        (t) => t.id !== tenant.id && t.roomId === tenant.roomId && t.status === 'Active'
      );
      if (!otherActive) {
        room.status = 'Vacant';
        await db.put('rooms', room);
      }
    }
  }
  await db.delete('tenants', id);
}

// Payments methods
export async function getPayments(): Promise<Payment[]> {
  const db = await getDB();
  const payments = await db.getAll('payments');
  return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

export async function savePayment(payment: Payment): Promise<void> {
  const db = await getDB();
  await db.put('payments', payment);
}

export async function deletePayment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('payments', id);
}

// Expenses methods
export async function getExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const expenses = await db.getAll('expenses');
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.put('expenses', expense);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}

// Export All Data Backup
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const property = await db.get('property', 'property');
  const rooms = await db.getAll('rooms');
  const tenants = await db.getAll('tenants');
  const payments = await db.getAll('payments');
  const expenses = await db.getAll('expenses');

  const backupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    property,
    rooms,
    tenants,
    payments,
    expenses,
  };

  return JSON.stringify(backupData, null, 2);
}

// Import All Data Backup
export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await getDB();

  const tx = db.transaction(['property', 'rooms', 'tenants', 'payments', 'expenses'], 'readwrite');
  
  if (data.property) {
    await tx.objectStore('property').put(data.property);
  }
  if (Array.isArray(data.rooms)) {
    await tx.objectStore('rooms').clear();
    for (const r of data.rooms) {
      await tx.objectStore('rooms').put(r);
    }
  }
  if (Array.isArray(data.tenants)) {
    await tx.objectStore('tenants').clear();
    for (const t of data.tenants) {
      await tx.objectStore('tenants').put(t);
    }
  }
  if (Array.isArray(data.payments)) {
    await tx.objectStore('payments').clear();
    for (const p of data.payments) {
      await tx.objectStore('payments').put(p);
    }
  }
  if (Array.isArray(data.expenses)) {
    await tx.objectStore('expenses').clear();
    for (const e of data.expenses) {
      await tx.objectStore('expenses').put(e);
    }
  }

  await tx.done;
}

export const exportAllDataJson = exportAllData;
export const importAllDataJson = importAllData;

// Clear All Data
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['property', 'rooms', 'tenants', 'payments', 'expenses'], 'readwrite');
  await tx.objectStore('property').clear();
  await tx.objectStore('rooms').clear();
  await tx.objectStore('tenants').clear();
  await tx.objectStore('payments').clear();
  await tx.objectStore('expenses').clear();
  await tx.done;
}

// Seed Sample Data
export async function seedSampleData(): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Format month name e.g. "September 2026"
  const getMonthStr = (offset: number) => {
    const d = new Date(year, month + offset, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getIsoDate = (offsetMonths: number, day: number) => {
    const d = new Date(year, month + offsetMonths, day);
    return d.toISOString().split('T')[0];
  };

  const property: Property = {
    id: 'property',
    name: 'CL LODGES AND HOMES / CL APARTMENTS',
    ownerName: 'Sendagire Razak',
    ownerPhone: '0778030847 / 0778006886',
    address: 'Plot 14, Kiwatule-Ntinda Road, Kampala',
    lastReceiptNumber: 6,
    createdAt: new Date(year, month - 6, 1).toISOString(),
  };

  const rooms: Room[] = [
    {
      id: 'room-1',
      number: 'A1',
      type: 'Self-Contained Single',
      rentAmount: 350000,
      description: 'Ground floor, tiled floor, private bathroom and kitchen sink',
      status: 'Occupied',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
    {
      id: 'room-2',
      number: 'A2',
      type: 'Single Room',
      rentAmount: 220000,
      description: 'Shared modern sanitation facilities, power sub-meter',
      status: 'Occupied',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
    {
      id: 'room-3',
      number: 'B1',
      type: 'Self-Contained Double',
      rentAmount: 550000,
      description: 'Spacious 2-room unit with balcony and secure perimeter',
      status: 'Occupied',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
    {
      id: 'room-4',
      number: 'B2',
      type: 'Self-Contained Double',
      rentAmount: 580000,
      description: 'Corner unit with modern wardrobes and perimeter lighting',
      status: 'Vacant',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
    {
      id: 'room-5',
      number: 'C1',
      type: 'Single Room',
      rentAmount: 200000,
      description: 'Quiet rear unit with burglar proofing and private tap',
      status: 'Occupied',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
    {
      id: 'room-6',
      number: 'C2',
      type: 'Bedsitter',
      rentAmount: 300000,
      description: 'Open plan studio with internal shower, freshly painted',
      status: 'Maintenance',
      createdAt: new Date(year, month - 5, 1).toISOString(),
    },
  ];

  const tenants: Tenant[] = [
    {
      id: 'tenant-1',
      fullName: 'Brian Mukasa',
      phone: '0778123456',
      phone2: '0702987654',
      nationalId: 'CM920141029KLM',
      roomId: 'room-1',
      monthlyRent: 350000,
      depositPaid: 350000,
      moveInDate: getIsoDate(-3, 1),
      rentDueDay: 1,
      notes: 'Pays promptly via MTN Mobile Money. Works at Nakawa.',
      status: 'Active',
      createdAt: new Date(year, month - 3, 1).toISOString(),
    },
    {
      id: 'tenant-2',
      fullName: 'Sarah Nakato',
      phone: '0754890123',
      phone2: '',
      nationalId: 'CF940251034PLN',
      roomId: 'room-2',
      monthlyRent: 220000,
      depositPaid: 220000,
      moveInDate: getIsoDate(-2, 5),
      rentDueDay: 5,
      notes: 'Nurse at Mulago Hospital. Very clean tenant.',
      status: 'Active',
      createdAt: new Date(year, month - 2, 5).toISOString(),
    },
    {
      id: 'tenant-3',
      fullName: 'David Okello',
      phone: '0782334455',
      phone2: '0752112233',
      nationalId: 'CM880192837TYU',
      roomId: 'room-3',
      monthlyRent: 550000,
      depositPaid: 550000,
      moveInDate: getIsoDate(-4, 1),
      rentDueDay: 1,
      notes: 'Family of 3. Usually pays by Bank Transfer.',
      status: 'Active',
      createdAt: new Date(year, month - 4, 1).toISOString(),
    },
    {
      id: 'tenant-4',
      fullName: 'Grace Namutebi',
      phone: '0701998877',
      phone2: '',
      nationalId: 'CF960112233QWE',
      roomId: 'room-5',
      monthlyRent: 200000,
      depositPaid: 200000,
      moveInDate: getIsoDate(-6, 1),
      leaseEndDate: getIsoDate(-1, 1),
      rentDueDay: 1,
      notes: 'Vacated at end of lease to relocate to Jinja.',
      status: 'Vacated',
      createdAt: new Date(year, month - 6, 1).toISOString(),
    },
  ];

  const currentMonthStr = getMonthStr(0);
  const prevMonthStr1 = getMonthStr(-1);
  const prevMonthStr2 = getMonthStr(-2);

  const payments: Payment[] = [
    {
      id: 'pay-1',
      receiptNumber: `RCT-${year}-0001`,
      tenantId: 'tenant-1',
      roomId: 'room-1',
      amountPaid: 350000,
      amountDue: 350000,
      periodMonth: prevMonthStr2,
      paymentDate: getIsoDate(-2, 2),
      paymentMethod: 'MTN Mobile Money',
      referenceNumber: 'MM240702.1045.A102',
      notes: 'Paid on time',
      createdAt: new Date(year, month - 2, 2).toISOString(),
    },
    {
      id: 'pay-2',
      receiptNumber: `RCT-${year}-0002`,
      tenantId: 'tenant-1',
      roomId: 'room-1',
      amountPaid: 350000,
      amountDue: 350000,
      periodMonth: prevMonthStr1,
      paymentDate: getIsoDate(-1, 1),
      paymentMethod: 'MTN Mobile Money',
      referenceNumber: 'MM240801.0920.B441',
      notes: 'Paid full',
      createdAt: new Date(year, month - 1, 1).toISOString(),
    },
    {
      id: 'pay-3',
      receiptNumber: `RCT-${year}-0003`,
      tenantId: 'tenant-1',
      roomId: 'room-1',
      amountPaid: 350000,
      amountDue: 350000,
      periodMonth: currentMonthStr,
      paymentDate: getIsoDate(0, 1),
      paymentMethod: 'MTN Mobile Money',
      referenceNumber: 'MM240901.1215.C902',
      notes: 'Current month paid in full',
      createdAt: new Date(year, month, 1).toISOString(),
    },
    {
      id: 'pay-4',
      receiptNumber: `RCT-${year}-0004`,
      tenantId: 'tenant-2',
      roomId: 'room-2',
      amountPaid: 220000,
      amountDue: 220000,
      periodMonth: prevMonthStr1,
      paymentDate: getIsoDate(-1, 5),
      paymentMethod: 'Airtel Money',
      referenceNumber: 'AIR554901928',
      notes: 'August rent',
      createdAt: new Date(year, month - 1, 5).toISOString(),
    },
    {
      id: 'pay-5',
      receiptNumber: `RCT-${year}-0005`,
      tenantId: 'tenant-3',
      roomId: 'room-3',
      amountPaid: 550000,
      amountDue: 550000,
      periodMonth: prevMonthStr1,
      paymentDate: getIsoDate(-1, 2),
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'STANBIC-FT-88910',
      notes: 'Stanbic Bank EFT',
      createdAt: new Date(year, month - 1, 2).toISOString(),
    },
    {
      id: 'pay-6',
      receiptNumber: `RCT-${year}-0006`,
      tenantId: 'tenant-3',
      roomId: 'room-3',
      amountPaid: 300000,
      amountDue: 550000,
      periodMonth: currentMonthStr,
      paymentDate: getIsoDate(0, 2),
      paymentMethod: 'Cash',
      referenceNumber: 'Handed at site',
      notes: 'Partial payment. Promised remaining UGX 250,000 by 20th.',
      createdAt: new Date(year, month, 2).toISOString(),
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      category: 'NWSC / Water',
      description: 'NWSC Water bill for compound & shared taps',
      amount: 145000,
      date: getIsoDate(0, 3),
      roomId: '',
      notes: 'National Water & Sewerage Corp receipt #449102',
      createdAt: new Date(year, month, 3).toISOString(),
    },
    {
      id: 'exp-2',
      category: 'Repairs / Maintenance',
      description: 'Plumbing repair for Unit A1 sink & pipe replacement',
      amount: 65000,
      date: getIsoDate(0, 5),
      roomId: 'room-1',
      notes: 'Handled by Plumber Ssempa',
      createdAt: new Date(year, month, 5).toISOString(),
    },
    {
      id: 'exp-3',
      category: 'Cleaning / Compound',
      description: 'Compound grass slashing and compound gate lubrication',
      amount: 50000,
      date: getIsoDate(0, 7),
      roomId: '',
      notes: 'Monthly cleaning & yard work',
      createdAt: new Date(year, month, 7).toISOString(),
    },
    {
      id: 'exp-4',
      category: 'Umeme / Electricity',
      description: 'Umeme Yaka compound security lighting tokens',
      amount: 80000,
      date: getIsoDate(-1, 10),
      roomId: '',
      notes: 'Meter #0421899120',
      createdAt: new Date(year, month - 1, 10).toISOString(),
    },
    {
      id: 'exp-5',
      category: 'Repairs / Maintenance',
      description: 'Repainting Unit C2 after tenant vacating',
      amount: 180000,
      date: getIsoDate(0, 8),
      roomId: 'room-6',
      notes: 'Sadolin emulsion + oil paint for skirting',
      createdAt: new Date(year, month, 8).toISOString(),
    },
  ];

  const db = await getDB();
  const tx = db.transaction(['property', 'rooms', 'tenants', 'payments', 'expenses'], 'readwrite');
  await tx.objectStore('property').put(property);

  await tx.objectStore('rooms').clear();
  for (const r of rooms) {
    await tx.objectStore('rooms').put(r);
  }

  await tx.objectStore('tenants').clear();
  for (const t of tenants) {
    await tx.objectStore('tenants').put(t);
  }

  await tx.objectStore('payments').clear();
  for (const p of payments) {
    await tx.objectStore('payments').put(p);
  }

  await tx.objectStore('expenses').clear();
  for (const e of expenses) {
    await tx.objectStore('expenses').put(e);
  }

  await tx.done;
}
