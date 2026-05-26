import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  return null;
}

export function formatDateOnlySafe(timestamp: any): string {
  if (!timestamp) return "N/A";
  const d = safeToDate(timestamp);
  if (!d) {
    const match = String(timestamp).match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      const year = match[1];
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${monthNames[monthIndex]} ${year}`;
      }
    }
    return String(timestamp);
  }
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  const monthName = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}
