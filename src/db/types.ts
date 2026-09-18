// Domain types matching the Python schema in FEATURES.md
export type Language = 'en' | 'ta';

export interface User {
  id: number;
  name: string;
  language: Language;
  caregiver_phone: string | null;
}

export type FoodRelation = 'before' | 'after' | 'any';
export type NotifyStyle = 'name' | 'generic';
export type FrequencyType = 'daily' | 'weekdays' | 'monthday';

export interface Medicine {
  id: number;
  name: string;
  notify_style: NotifyStyle;
  frequency_type: FrequencyType;
  /** csv "0,2,4" for weekdays (0=Mon..6=Sun) */
  weekdays: string | null;
  /** 1..31 for monthday */
  month_day: number | null;
  food_relation: FoodRelation;
  stock_count: number;
  low_stock_threshold: number;
  voice_clip: string | null;
  created_at: string;
}

export interface Schedule {
  id: number;
  medicine_id: number;
  /** 'morning' | 'afternoon' | 'night' */
  shift: 'morning' | 'afternoon' | 'night';
  /** "HH:MM" 24-hour */
  time_hhmm: string;
  dose_qty: number;
  enabled: number; // 0/1
}

export type ReminderStatus = 'pending' | 'snoozed' | 'taken' | 'skipped' | 'missed';

export interface ReminderEvent {
  id: number;
  schedule_id: number;
  medicine_id: number;
  /** ISO timestamp the dose is due */
  due_at: string;
  status: ReminderStatus;
  snooze_count: number;
  renotify_count: number;
  responded_at: string | null;
  /** id of OS-scheduled notification (so we can cancel) */
  notification_id: string | null;
}

export type AppointmentStatus = 'pending' | 'visited' | 'skipped';

export interface Appointment {
  id: number;
  doctor_name: string;
  /** ISO timestamp */
  when_at: string;
  notes: string | null;
  status: AppointmentStatus;
  notification_id: string | null;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface Settings {
  auto_renotify_minutes: number;
  skip_renotify_minutes: number;
  max_snoozes_per_dose: number;
  caregiver_threshold: number;
  appointment_lead_hours: number;
  caregiver_email: string;
  sender_email: string;
  sender_email_password: string;
  resend_api_key: string;
  appointment_voice_clip: string;
  low_stock_voice_clip: string;
}

export const DEFAULT_SETTINGS: Settings = {
  auto_renotify_minutes: 30,
  skip_renotify_minutes: 15,
  max_snoozes_per_dose: 3,
  caregiver_threshold: 2,
  appointment_lead_hours: 12,
  caregiver_email: '',
  sender_email: '',
  sender_email_password: '',
  resend_api_key: '',
  appointment_voice_clip: '',
  low_stock_voice_clip: '',
};
