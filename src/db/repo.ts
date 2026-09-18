import { getDb } from './database';
import {
  User,
  Medicine,
  Schedule,
  ReminderEvent,
  Appointment,
  ReminderStatus,
  AppointmentStatus,
  Settings,
  DEFAULT_SETTINGS,
} from './types';

// ============ USER ============
export function getUser(): User | null {
  const db = getDb();
  return (db.getFirstSync<User>('SELECT * FROM user LIMIT 1')) ?? null;
}

export function createUser(name: string, language: 'en' | 'ta', caregiverPhone: string | null): User {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO user (name, language, caregiver_phone) VALUES (?, ?, ?)',
    name, language, caregiverPhone,
  );
  return { id: res.lastInsertRowId as number, name, language, caregiver_phone: caregiverPhone };
}

export function updateUser(u: Partial<User> & { id: number }): void {
  const db = getDb();
  const current = getUser();
  if (!current) return;
  const merged = { ...current, ...u };
  db.runSync(
    'UPDATE user SET name=?, language=?, caregiver_phone=? WHERE id=?',
    merged.name, merged.language, merged.caregiver_phone, merged.id,
  );
}

// ============ MEDICINE ============
function coerceMedicine(m: Medicine): Medicine {
  // Defensive: older builds let users save garbage strings into numeric
  // columns. Coerce them to numbers on read so the UI stays sane.
  const toNum = (v: any, fallback = 0): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const cleaned = String(v ?? '').replace(/[^0-9]/g, '');
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    ...m,
    stock_count: toNum(m.stock_count, 0),
    low_stock_threshold: toNum(m.low_stock_threshold, 0),
    month_day: toNum(m.month_day, 1),
  };
}

export function listMedicines(): Medicine[] {
  return getDb()
    .getAllSync<Medicine>('SELECT * FROM medicine ORDER BY name ASC')
    .map(coerceMedicine);
}

export function getMedicine(id: number): Medicine | null {
  const row = getDb().getFirstSync<Medicine>('SELECT * FROM medicine WHERE id=?', id);
  const result = row ? coerceMedicine(row) : null;
  console.log('[getMedicine] id=', id, 'stock_count=', result?.stock_count);
  return result;
}

export function insertMedicine(m: Omit<Medicine, 'id' | 'created_at'>): number {
  const db = getDb();
  const res = db.runSync(
    `INSERT INTO medicine
      (name, notify_style, frequency_type, weekdays, month_day, food_relation, stock_count, low_stock_threshold, voice_clip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    m.name, m.notify_style, m.frequency_type, m.weekdays, m.month_day,
    m.food_relation, m.stock_count, m.low_stock_threshold, m.voice_clip,
  );
  return res.lastInsertRowId as number;
}

export function updateMedicine(m: Medicine): void {
  const db = getDb();
  db.runSync(
    `UPDATE medicine SET name=?, notify_style=?, frequency_type=?, weekdays=?, month_day=?,
      food_relation=?, stock_count=?, low_stock_threshold=?, voice_clip=? WHERE id=?`,
    m.name, m.notify_style, m.frequency_type, m.weekdays, m.month_day,
    m.food_relation, m.stock_count, m.low_stock_threshold, m.voice_clip, m.id,
  );
}

export function deleteMedicine(id: number): void {
  getDb().runSync('DELETE FROM medicine WHERE id=?', id);
}

export function setStock(id: number, count: number): void {
  console.log(`[stock] setStock id=${id} count=${count}`);
  getDb().runSync('UPDATE medicine SET stock_count=? WHERE id=?', count, id);
}

export function decrementStock(id: number, qty: number): number {
  console.log(`[stock] decrementStock id=${id} qty=${qty}`);
  const db = getDb();
  db.runSync('UPDATE medicine SET stock_count = stock_count - ? WHERE id=?', qty, id);
  const row = db.getFirstSync<{ stock_count: number; low_stock_threshold: number }>(
    'SELECT stock_count, low_stock_threshold FROM medicine WHERE id=?', id,
  );
  const newStock = row?.stock_count ?? 0;
  console.log(`[stock] after decrement: id=${id} new stock=${newStock}`);
  return newStock;
}

// ============ SCHEDULE ============
export function listSchedules(medicineId: number): Schedule[] {
  return getDb().getAllSync<Schedule>(
    'SELECT * FROM schedule WHERE medicine_id=? ORDER BY time_hhmm ASC', medicineId,
  );
}

export function listAllSchedules(): Schedule[] {
  return getDb().getAllSync<Schedule>('SELECT * FROM schedule WHERE enabled=1');
}

export function insertSchedule(s: Omit<Schedule, 'id'>): number {
  const res = getDb().runSync(
    'INSERT INTO schedule (medicine_id, shift, time_hhmm, dose_qty, enabled) VALUES (?, ?, ?, ?, ?)',
    s.medicine_id, s.shift, s.time_hhmm, s.dose_qty, s.enabled,
  );
  return res.lastInsertRowId as number;
}

export function replaceSchedules(medicineId: number, schedules: Omit<Schedule, 'id' | 'medicine_id'>[]): void {
  const db = getDb();
  db.runSync('DELETE FROM schedule WHERE medicine_id=?', medicineId);
  for (const s of schedules) {
    db.runSync(
      'INSERT INTO schedule (medicine_id, shift, time_hhmm, dose_qty, enabled) VALUES (?, ?, ?, ?, ?)',
      medicineId, s.shift, s.time_hhmm, s.dose_qty, s.enabled,
    );
  }
}

// ============ REMINDER EVENT ============
export function todaysEvents(): (ReminderEvent & { medicine_name: string; dose_qty: number })[] {
  const db = getDb();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return db.getAllSync<ReminderEvent & { medicine_name: string; dose_qty: number }>(
    `SELECT e.*, m.name AS medicine_name, s.dose_qty AS dose_qty
     FROM reminder_event e
     JOIN medicine m ON m.id = e.medicine_id
     JOIN schedule s ON s.id = e.schedule_id
     WHERE e.due_at BETWEEN ? AND ?
     ORDER BY e.due_at ASC`,
    start.toISOString(), end.toISOString(),
  );
}

export function findEventByScheduleAndDue(scheduleId: number, dueIso: string): ReminderEvent | null {
  return getDb().getFirstSync<ReminderEvent>(
    'SELECT * FROM reminder_event WHERE schedule_id=? AND due_at=?',
    scheduleId, dueIso,
  ) ?? null;
}

/** Any event today for this schedule, regardless of current due_at (handles skip/snooze). */
export function findTodaysEventForSchedule(scheduleId: number): ReminderEvent | null {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return getDb().getFirstSync<ReminderEvent>(
    'SELECT * FROM reminder_event WHERE schedule_id=? AND due_at BETWEEN ? AND ? ORDER BY id DESC',
    scheduleId, start.toISOString(), end.toISOString(),
  ) ?? null;
}

export function getEvent(id: number): ReminderEvent | null {
  return getDb().getFirstSync<ReminderEvent>('SELECT * FROM reminder_event WHERE id=?', id) ?? null;
}

export function insertEvent(e: Omit<ReminderEvent, 'id'>): number {
  const res = getDb().runSync(
    `INSERT INTO reminder_event
      (schedule_id, medicine_id, due_at, status, snooze_count, renotify_count, responded_at, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    e.schedule_id, e.medicine_id, e.due_at, e.status,
    e.snooze_count, e.renotify_count, e.responded_at, e.notification_id,
  );
  return res.lastInsertRowId as number;
}

export function updateEventStatus(id: number, status: ReminderStatus): void {
  getDb().runSync(
    'UPDATE reminder_event SET status=?, responded_at=datetime("now") WHERE id=?',
    status, id,
  );
}

export function updateEventDue(id: number, dueIso: string): void {
  getDb().runSync('UPDATE reminder_event SET due_at=?, status="snoozed" WHERE id=?', dueIso, id);
}

export function bumpSnooze(id: number): number {
  const db = getDb();
  db.runSync('UPDATE reminder_event SET snooze_count = snooze_count + 1 WHERE id=?', id);
  const row = db.getFirstSync<{ snooze_count: number }>(
    'SELECT snooze_count FROM reminder_event WHERE id=?', id);
  return row?.snooze_count ?? 0;
}

export function bumpRenotify(id: number): number {
  const db = getDb();
  db.runSync('UPDATE reminder_event SET renotify_count = renotify_count + 1 WHERE id=?', id);
  const row = db.getFirstSync<{ renotify_count: number }>(
    'SELECT renotify_count FROM reminder_event WHERE id=?', id);
  return row?.renotify_count ?? 0;
}

export function setEventNotificationId(id: number, notifId: string | null): void {
  getDb().runSync('UPDATE reminder_event SET notification_id=? WHERE id=?', notifId, id);
}

export function deleteEvent(id: number): void {
  getDb().runSync('DELETE FROM reminder_event WHERE id=?', id);
}

/** Delete every reminder event whose due_at falls in today (local). */
export function deleteTodaysEvents(): void {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  getDb().runSync(
    'DELETE FROM reminder_event WHERE due_at BETWEEN ? AND ?',
    start.toISOString(), end.toISOString(),
  );
}

export function missedInLast24h(): number {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const row = getDb().getFirstSync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM reminder_event WHERE status="missed" AND due_at >= ?', since,
  );
  return row?.c ?? 0;
}

// ============ APPOINTMENTS ============
export function listAppointments(): Appointment[] {
  return getDb().getAllSync<Appointment>('SELECT * FROM appointment ORDER BY when_at ASC');
}

export function todaysAppointments(): Appointment[] {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return getDb().getAllSync<Appointment>(
    'SELECT * FROM appointment WHERE when_at BETWEEN ? AND ? ORDER BY when_at ASC',
    start.toISOString(), end.toISOString(),
  );
}

export function getAppointment(id: number): Appointment | null {
  return getDb().getFirstSync<Appointment>('SELECT * FROM appointment WHERE id=?', id) ?? null;
}

export function insertAppointment(a: Omit<Appointment, 'id'>): number {
  const res = getDb().runSync(
    'INSERT INTO appointment (doctor_name, when_at, notes, status, notification_id) VALUES (?, ?, ?, ?, ?)',
    a.doctor_name, a.when_at, a.notes, a.status, a.notification_id,
  );
  return res.lastInsertRowId as number;
}

export function updateAppointment(a: Appointment): void {
  getDb().runSync(
    'UPDATE appointment SET doctor_name=?, when_at=?, notes=?, status=?, notification_id=? WHERE id=?',
    a.doctor_name, a.when_at, a.notes, a.status, a.notification_id, a.id,
  );
}

export function setAppointmentStatus(id: number, status: AppointmentStatus): void {
  getDb().runSync('UPDATE appointment SET status=? WHERE id=?', status, id);
}

export function deleteAppointment(id: number): void {
  getDb().runSync('DELETE FROM appointment WHERE id=?', id);
}

// ============ SETTINGS ============
export function getSettings(): Settings {
  const rows = getDb().getAllSync<{ key: string; value: string }>('SELECT key, value FROM setting');
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const k = r.key as keyof Settings;
    if (k in out) {
      const def = (DEFAULT_SETTINGS as any)[k];
      (out as any)[k] = typeof def === 'number' ? Number(r.value) : r.value;
    }
  }
  return out;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO setting (key, value) VALUES (?, ?)',
    String(key), String(value),
  );
}

export function saveSettings(s: Partial<Settings>): void {
  for (const k of Object.keys(s) as (keyof Settings)[]) {
    setSetting(k, s[k] as any);
  }
}

// One-shot key stored in the same setting table but outside the typed Settings surface.
export function getIntroSeen(): boolean {
  const row = getDb().getFirstSync<{ value: string }>(
    "SELECT value FROM setting WHERE key = 'intro_seen'",
  );
  return row?.value === '1';
}

export function setIntroSeen(seen: boolean): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO setting (key, value) VALUES (?, ?)',
    'intro_seen', seen ? '1' : '0',
  );
}
