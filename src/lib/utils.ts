import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to IST timezone
 */
export function formatToIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Validate mobile number format (must start with 91 and be exactly 12 digits)
 */
export function validateMobileNumber(mobile: string): boolean {
  const regex = /^91\d{10}$/;
  return regex.test(mobile);
}

/**
 * Validate monthly date (must be between 1-28)
 */
export function validateMonthlyDate(date: number): boolean {
  return date >= 1 && date <= 28;
}

/**
 * Validate yearly date (DD/MM/YYYY format)
 */
export function validateYearlyDate(date: string): boolean {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (!regex.test(date)) return false;

  const [day, month, year] = date.split("/").map(Number);
  const dateObj = new Date(year, month - 1, day);

  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}
