import { format } from 'date-fns';

export function fmtTime(iso: string | Date): string {
  return format(new Date(iso), 'HH:mm');
}

export function fmtDateTime(iso: string | Date): string {
  return format(new Date(iso), 'MMM d, HH:mm');
}

export function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
