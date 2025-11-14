import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { addDays, addMonths, addYears, startOfDay, isWithinInterval, parseISO, parse, format } from 'date-fns';

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

interface TriggerData {
  id: string;
  offset: number;
  direction: 'BEFORE' | 'AFTER' | null;
  time: string;
  status: 'ACTIVE' | 'PAUSED';
}

interface RecordData {
  id: string;
  date: string;
  componentId: string;
}

interface ComponentData {
  id: string;
  occurrenceType: 'MONTHLY' | 'YEARLY';
  status: 'ACTIVE' | 'PAUSED';
  triggers: TriggerData[];
  records: RecordData[];
}

/**
 * Calculate the next scheduled datetime for a record+trigger combination
 */
export function calculateNextOccurrence(
  record: RecordData,
  trigger: TriggerData,
  occurrenceType: 'MONTHLY' | 'YEARLY',
  baseDate: Date = new Date()
): Date | null {
  try {
    const now = utcToZonedTime(baseDate, TIMEZONE);
    let targetDate: Date;

    if (occurrenceType === 'MONTHLY') {
      // date field is "1" to "28" (day of month)
      const dayOfMonth = parseInt(record.date);
      if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
        return null;
      }

      // Find next occurrence of this day
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);

      // If current month's date hasn't passed yet, use it; otherwise use next month
      targetDate = currentMonth >= startOfDay(now) ? currentMonth : nextMonth;
    } else {
      // YEARLY - date field is "DD/MM/YYYY"
      const dateParts = record.date.split('/');
      if (dateParts.length !== 3) {
        return null;
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(dateParts[2]);

      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return null;
      }

      // Find next occurrence of this date
      const currentYear = new Date(now.getFullYear(), month, day);
      const nextYear = new Date(now.getFullYear() + 1, month, day);

      targetDate = currentYear >= startOfDay(now) ? currentYear : nextYear;
    }

    // Apply offset
    if (trigger.direction === 'BEFORE') {
      targetDate = addDays(targetDate, -trigger.offset);
    } else if (trigger.direction === 'AFTER') {
      targetDate = addDays(targetDate, trigger.offset);
    }
    // If direction is null, offset should be 0 (exact date)

    // Parse trigger time (format: "HH:MM AM/PM")
    const timeParts = trigger.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) {
      return null;
    }

    let hours = parseInt(timeParts[1]);
    const minutes = parseInt(timeParts[2]);
    const period = timeParts[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    // Set the time
    targetDate.setHours(hours, minutes, 0, 0);

    // Convert back to UTC
    return zonedTimeToUtc(targetDate, TIMEZONE);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return null;
  }
}

/**
 * Count upcoming reminders for a user within the next N days
 */
export function countUpcomingReminders(
  components: ComponentData[],
  days: number = 7
): number {
  const now = new Date();
  const futureDate = addDays(now, days);

  let count = 0;

  for (const component of components) {
    // Skip inactive components
    if (component.status !== 'ACTIVE') {
      continue;
    }

    for (const trigger of component.triggers) {
      // Skip inactive triggers
      if (trigger.status !== 'ACTIVE') {
        continue;
      }

      for (const record of component.records) {
        const nextOccurrence = calculateNextOccurrence(
          record,
          trigger,
          component.occurrenceType,
          now
        );

        if (nextOccurrence && isWithinInterval(nextOccurrence, { start: now, end: futureDate })) {
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Get all upcoming reminders with details within the next N days
 */
export interface UpcomingReminder {
  recordId: string;
  recordName?: string;
  componentId: string;
  componentName?: string;
  triggerId: string;
  scheduledAt: Date;
}

export function getUpcomingReminders(
  components: ComponentData[],
  days: number = 7
): UpcomingReminder[] {
  const now = new Date();
  const futureDate = addDays(now, days);
  const reminders: UpcomingReminder[] = [];

  for (const component of components) {
    // Skip inactive components
    if (component.status !== 'ACTIVE') {
      continue;
    }

    for (const trigger of component.triggers) {
      // Skip inactive triggers
      if (trigger.status !== 'ACTIVE') {
        continue;
      }

      for (const record of component.records) {
        const nextOccurrence = calculateNextOccurrence(
          record,
          trigger,
          component.occurrenceType,
          now
        );

        if (nextOccurrence && isWithinInterval(nextOccurrence, { start: now, end: futureDate })) {
          reminders.push({
            recordId: record.id,
            componentId: component.id,
            triggerId: trigger.id,
            scheduledAt: nextOccurrence,
          });
        }
      }
    }
  }

  // Sort by scheduled time
  return reminders.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
