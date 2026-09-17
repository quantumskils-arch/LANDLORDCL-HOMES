/**
 * Formats a number to Ugandan Shillings format: UGX X,XXX,XXX
 */
export function formatUGX(amount: number | null | undefined): string {
  const num = Math.round(Number(amount) || 0);
  return `UGX ${num.toLocaleString('en-US')}`;
}

/**
 * Formats date to user-friendly "15 July 2025" format
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  // Use en-GB style: Day Month Year (e.g., 15 July 2025)
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Returns current month-year string e.g. "July 2025"
 */
export function getCurrentMonthYear(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Formats a Date object to "Month Year" string e.g. "July 2025"
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Parses a "July 2025" string into a Date object (first day of month)
 */
export function parseMonthYear(monthYearStr: string): Date {
  const [monthName, yearStr] = monthYearStr.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = monthNames.indexOf(monthName);
  const year = parseInt(yearStr, 10);
  if (monthIndex !== -1 && !isNaN(year)) {
    return new Date(year, monthIndex, 1);
  }
  return new Date();
}

/**
 * Shifts month by offset (+1 or -1)
 */
export function shiftMonth(monthYearStr: string, offset: number): string {
  const d = parseMonthYear(monthYearStr);
  d.setMonth(d.getMonth() + offset);
  return formatMonthYear(d);
}

/**
 * Formats phone number for WhatsApp link (Uganda prefix +256 if needed)
 */
export function cleanUgandaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('256')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `256${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Generate WhatsApp reminder URL
 */
export function getWhatsAppReminderUrl(params: {
  phone: string;
  tenantName: string;
  amount: number;
  roomNumber: string;
  dueDateStr: string;
  ownerName: string;
}): string {
  const phone = cleanUgandaPhone(params.phone);
  const formattedAmount = formatUGX(params.amount);
  const text = `Dear ${params.tenantName}, this is a reminder that your rent of ${formattedAmount} for ${params.roomNumber} was due on ${params.dueDateStr}. Please arrange payment. Thank you, ${params.ownerName}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp receipt share URL
 */
export function getWhatsAppReceiptUrl(params: {
  tenantPhone: string;
  tenantName: string;
  period: string;
  amount: number;
  receiptNo: string;
  ownerName: string;
}): string {
  const phone = cleanUgandaPhone(params.tenantPhone);
  const formattedAmount = formatUGX(params.amount);
  const text = `Dear ${params.tenantName}, please find your payment receipt for ${params.period} attached. Amount: ${formattedAmount}. Receipt No: ${params.receiptNo}. Thank you, ${params.ownerName}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
