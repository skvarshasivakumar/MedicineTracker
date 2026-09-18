import {
  listAllSchedules,
  listMedicines,
  listSchedules,
  findTodaysEventForSchedule,
  insertEvent,
  todaysEvents,
  getEvent,
  updateEventStatus,
  updateEventDue,
  bumpSnooze,
  bumpRenotify,
  setEventNotificationId,
  decrementStock,
  getMedicine,
  getSettings,
  getUser,
  listAppointments,
  updateAppointment,
} from '@/db/repo';
import {
  ensureNotificationPermission,
  scheduleNotification,
  cancelNotification,
} from './notifications';
import { checkCaregiverThresholdAndAlert } from './email';
import { i18n, t } from '@/i18n';
import { Platform } from 'react-native';

/**
 * Tracks the last time we fired ANY notification (initial or renotify) for an
 * event, so back-to-back planToday() + renotifyIfUnanswered() calls don't
 * double-notify, and so rapid boots stay quiet.
 */
const _lastRenotifyAt = new Map<number, number>();

/** Build today's `due_at` ISO from HH:MM. */
function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Does a schedule fire today, given its medicine's frequency rules? */
function scheduleFiresToday(medFreqType: string, weekdays: string | null, monthDay: number | null): boolean {
  const now = new Date();
  if (medFreqType === 'daily') return true;
  if (medFreqType === 'weekdays') {
    // 0=Mon..6=Sun. JS getDay(): 0=Sun..6=Sat; convert.
    const jsDow = now.getDay(); // 0=Sun
    const mondayBased = (jsDow + 6) % 7; // 0=Mon..6=Sun
    if (!weekdays) return false;
    return weekdays.split(',').map((x) => x.trim()).includes(String(mondayBased));
  }
  if (medFreqType === 'monthday') {
    return monthDay != null && now.getDate() === monthDay;
  }
  return false;
}

/**
 * planToday: ensure a reminder_event exists for every schedule due today, and
 * each is OS-scheduled (or fired right away if overdue with no response).
 * Also schedules appointment lead-time notifications.
 */
export async function planToday(): Promise<void> {
  await ensureNotificationPermission();

  const meds = listMedicines();
  const medById = new Map(meds.map((m) => [m.id, m]));
  const schedules = listAllSchedules();
  const u = getUser();

  let staggerMs = 0; // for catch-up: stagger overdue immediate fires 5s apart

  for (const s of schedules) {
    const med = medById.get(s.medicine_id);
    if (!med) continue;
    if (!scheduleFiresToday(med.frequency_type, med.weekdays, med.month_day)) continue;

    const due = todayAt(s.time_hhmm);
    const dueIso = due.toISOString();

    // Look up any existing event for this schedule today — handles cases
    // where the user already skipped/snoozed it (which shifts due_at).
    let event = findTodaysEventForSchedule(s.id);
    if (!event) {
      const id = insertEvent({
        schedule_id: s.id,
        medicine_id: s.medicine_id,
        due_at: dueIso,
        status: 'pending',
        snooze_count: 0,
        renotify_count: 0,
        responded_at: null,
        notification_id: null,
      });
      event = getEvent(id);
    }
    if (!event) continue;
    if (event.status === 'taken' || event.status === 'skipped' || event.status === 'missed') continue;

    // already has a pending OS notification id? leave it
    if (event.notification_id) continue;

    const settings = getSettings();
    const windowMs = settings.auto_renotify_minutes * 60 * 1000;
    const overdueMs = Date.now() - due.getTime();

    // If a shift is already past the point where every renotify would have
    // fired (e.g. user just added a med late in the day, or app was closed
    // through the dose time), mark it missed silently instead of firing a
    // burst of catch-up notifications.
    if (overdueMs > windowMs * 3) {
      updateEventStatus(event.id, 'missed');
      setEventNotificationId(event.id, null);
      _lastRenotifyAt.set(event.id, Date.now());
      continue;
    }

    const overdue = overdueMs > 0;
    const fireAt = overdue
      ? new Date(Date.now() + 2000 + staggerMs)
      : due;
    if (overdue) staggerMs += 5000;

    const notifId = await scheduleNotification({
      title: t('app_name'),
      body: med.notify_style === 'name'
        ? t('voice_reminder_named', { med: med.name })
        : t('voice_reminder_generic'),
      data: { type: 'dose', eventId: event.id },
      fireAt,
      voiceText: med.notify_style === 'name'
        ? t('voice_reminder_named', { med: med.name })
        : t('voice_reminder_generic'),
      voiceLang: u?.language ?? 'en',
      voiceClip: med.voice_clip,
    });
    setEventNotificationId(event.id, notifId);
    // Seed the renotify throttle so the immediate renotifyIfUnanswered() pass
    // (which follows in bootSchedulerOnce) does not double-fire on the same event.
    _lastRenotifyAt.set(event.id, Date.now());
  }

  await planAppointments();
}

async function planAppointments(): Promise<void> {
  const s = getSettings();
  const leadMs = s.appointment_lead_hours * 3600 * 1000;
  const appts = listAppointments();
  const u = getUser();
  const lang = u?.language ?? 'en';
  
  for (const a of appts) {
    if (a.status !== 'pending') continue;
    if (a.notification_id) continue;
    const due = new Date(a.when_at).getTime() - leadMs;
    const fireAt = due > Date.now() ? new Date(due) : new Date(Date.now() + 2000);
    if (new Date(a.when_at).getTime() < Date.now()) continue;
    
    const voiceText = t('voice_appointment', { doctor: a.doctor_name });
    const notifId = await scheduleNotification({
      title: t('app_name'),
      body: voiceText,
      data: { type: 'appointment', appointmentId: a.id },
      fireAt,
      voiceText,
      voiceLang: lang,
      voiceClip: s.appointment_voice_clip || null,
    });
    a.notification_id = notifId;
    updateAppointment(a);
  }
}

// ============ DOSE RESPONSE ACTIONS ============

export async function actionTook(eventId: number): Promise<void> {
  console.log('[actionTook] eventId=', eventId);
  const ev = getEvent(eventId);
  if (!ev) return;
  const med = getMedicine(ev.medicine_id);
  console.log('[actionTook] medicine:', med?.name, 'current stock:', med?.stock_count);
  await cancelNotification(ev.notification_id);
  updateEventStatus(eventId, 'taken');
  setEventNotificationId(eventId, null);

  if (med) {
    const schedules = listSchedules(med.id);
    const sch = schedules.find((s) => s.id === ev.schedule_id);
    const qty = sch?.dose_qty ?? 1;
    console.log('[actionTook] decrementing by:', qty);
    const remaining = decrementStock(med.id, qty);
    console.log('[actionTook] stock after decrement:', remaining);
    if (remaining <= med.low_stock_threshold) {
      const u = getUser();
      const lang = u?.language ?? 'en';
      const settings = getSettings();
      const body = t('voice_low_stock', { med: med.name });
      await scheduleNotification({
        title: t('low_stock'),
        body,
        voiceText: body,
        voiceLang: lang,
        voiceClip: settings.low_stock_voice_clip || med.voice_clip,
      });
    }
  }
}

export async function actionSkip(eventId: number): Promise<void> {
  const ev = getEvent(eventId);
  if (!ev) return;
  const s = getSettings();
  await cancelNotification(ev.notification_id);
  const newDue = new Date(Date.now() + s.skip_renotify_minutes * 60 * 1000);
  updateEventDue(eventId, newDue.toISOString());
  await rescheduleFireForEvent(eventId, newDue);
}

export async function actionLater(eventId: number, minutes: number): Promise<void> {
  const ev = getEvent(eventId);
  if (!ev) return;
  const s = getSettings();
  const newCount = bumpSnooze(eventId);
  if (newCount > s.max_snoozes_per_dose) {
    await cancelNotification(ev.notification_id);
    updateEventStatus(eventId, 'missed');
    setEventNotificationId(eventId, null);
    await checkCaregiverThresholdAndAlert();
    return;
  }
  await cancelNotification(ev.notification_id);
  const newDue = new Date(Date.now() + minutes * 60 * 1000);
  updateEventDue(eventId, newDue.toISOString());
  await rescheduleFireForEvent(eventId, newDue);
}

async function rescheduleFireForEvent(eventId: number, fireAt: Date): Promise<void> {
  const ev = getEvent(eventId);
  if (!ev) return;
  const med = getMedicine(ev.medicine_id);
  if (!med) return;
  const u = getUser();
  const lang = u?.language ?? 'en';
  const voiceText = med.notify_style === 'name'
    ? t('voice_reminder_named', { med: med.name })
    : t('voice_reminder_generic');
  console.log(`[reschedule] eventId=${eventId} med=${med.name} voice="${voiceText}" lang=${lang} clip=${med.voice_clip}`);
  const notifId = await scheduleNotification({
    title: t('app_name'),
    body: voiceText,
    data: { type: 'dose', eventId },
    fireAt,
    voiceText,
    voiceLang: lang,
    voiceClip: med.voice_clip,
  });
  setEventNotificationId(eventId, notifId);
}

/**
 * renotifyIfUnanswered: walks today's events. If a `pending` event is past due
 * by the configured window and hasn't been responded to, fire a follow-up
 * "you missed…" alert. After two such follow-ups, mark it missed and check
 * the caregiver threshold.
 *
 * Call this on app foreground and periodically while the app runs.
 */
export async function renotifyIfUnanswered(): Promise<void> {
  const s = getSettings();
  const events = todaysEvents();
  const now = Date.now();
  const windowMs = s.auto_renotify_minutes * 60 * 1000;
  const u = getUser();
  const lang = u?.language ?? 'en';

  for (const ev of events) {
    if (ev.status !== 'pending' && ev.status !== 'snoozed') continue;
    const dueMs = new Date(ev.due_at).getTime();
    if (now - dueMs < windowMs) continue;

    if (ev.renotify_count >= 2) {
      // mark missed
      updateEventStatus(ev.id, 'missed');
      await cancelNotification(ev.notification_id);
      setEventNotificationId(ev.id, null);
      continue;
    }

    // Throttle: don't re-fire renotify for the same event within the window,
    // even if bootSchedulerOnce() / heartbeat / focus all fire in quick succession.
    const last = _lastRenotifyAt.get(ev.id) ?? 0;
    if (now - last < windowMs) continue;
    _lastRenotifyAt.set(ev.id, now);

    bumpRenotify(ev.id);
    const med = getMedicine(ev.medicine_id);
    if (!med) continue;
    const body = t('voice_missed', { med: med.name });
    await scheduleNotification({
      title: t('app_name'),
      body,
      data: { type: 'dose-renotify', eventId: ev.id },
      voiceText: body,
      voiceLang: lang,
      voiceClip: med.voice_clip,
    });
  }

  // After processing, if any was marked missed, check threshold
  await checkCaregiverThresholdAndAlert();
}

/** Convenience: re-plan + run a renotify sweep. Throttled & non-reentrant. */
let _bootInFlight: Promise<void> | null = null;
let _lastBootAt = 0;
export async function bootSchedulerOnce(force: boolean = false): Promise<void> {
  if (_bootInFlight) return _bootInFlight;
  const now = Date.now();
  // Coalesce rapid calls (focus + refresh + AppState etc.) into one run.
  if (!force && now - _lastBootAt < 10 * 1000) return;
  _lastBootAt = now;
  _bootInFlight = (async () => {
    try {
      await planToday();
      await renotifyIfUnanswered();
    } catch (e) {
      console.warn('[scheduler] boot failed', e);
    } finally {
      _bootInFlight = null;
    }
  })();
  return _bootInFlight;
}

/** Set up the periodic in-app heartbeat. Returns a cleanup fn. */
export function startSchedulerHeartbeat(): () => void {
  const planTimer = setInterval(() => { void planToday(); }, 60 * 60 * 1000); // hourly
  const renotifyTimer = setInterval(() => { void renotifyIfUnanswered(); }, 5 * 60 * 1000); // every 5 min
  return () => {
    clearInterval(planTimer);
    clearInterval(renotifyTimer);
  };
}
