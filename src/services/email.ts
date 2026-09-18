import * as MailComposer from 'expo-mail-composer';
import { Platform } from 'react-native';
import { getSettings, getUser, missedInLast24h } from '@/db/repo';

/**
 * Caregiver email alert.
 *
 * The original Python app used Gmail SMTP directly. From React Native we cannot
 * open raw SMTP sockets safely, so we support two paths:
 *   1. Resend HTTP API (recommended — set `resend_api_key` in Settings).
 *   2. expo-mail-composer fallback that opens the device's mail client so the
 *      user can tap Send (also used for the "send test email" button).
 */

export async function sendCaregiverEmail(opts: {
  subject: string;
  body: string;
}): Promise<{ ok: boolean; method: 'resend' | 'composer' | 'none'; error?: string }> {
  const s = getSettings();
  const to = s.caregiver_email.trim();
  console.log('[email] sendCaregiverEmail to:', to);
  if (!to) return { ok: false, method: 'none', error: 'No caregiver email set' };

  // 1) HTTP API path (native only - web has CORS restrictions)
  if (s.resend_api_key.trim() && s.sender_email.trim()) {
    if (Platform.OS === 'web') {
      console.warn('[email] Resend API unavailable on web due to CORS - email only works on native app');
      return {
        ok: false,
        method: 'none',
        error:
          'Email alerts work on the native mobile app only.\n\n' +
          'Web browsers block direct API calls to Resend due to CORS security policy. ' +
          'To test on web, you would need a backend proxy server.\n\n' +
          'Install the app on your phone (see DEPLOY.md) to enable caregiver email alerts.',
      };
    }
    console.log('[email] trying Resend API from:', s.sender_email.trim());
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${s.resend_api_key.trim()}`,
        },
        body: JSON.stringify({
          from: s.sender_email.trim(),
          to: [to],
          subject: opts.subject,
          text: opts.body,
        }),
      });
      if (res.ok) {
        console.log('[email] Resend success');
        return { ok: true, method: 'resend' };
      }
      const text = await res.text();
      console.warn('[email] Resend failed:', res.status, text);
      return { ok: false, method: 'resend', error: `Resend HTTP ${res.status}: ${text}` };
    } catch (e: any) {
      console.warn('[email] Resend error:', e);
      return { ok: false, method: 'resend', error: e?.message ?? String(e) };
    }
  }

  // 2) Mail composer fallback (native only)
  if (Platform.OS === 'web') {
    console.warn('[email] web platform needs Resend API — mail composer not available');
    return {
      ok: false,
      method: 'none',
      error: 'On web, you must configure Resend API key + sender email in Settings to send caregiver alerts.',
    };
  }
  console.log('[email] trying native mail composer');
  const available = await MailComposer.isAvailableAsync();
  if (!available) {
    console.warn('[email] mail composer not available');
    return { ok: false, method: 'none', error: 'No mail composer available and no Resend API key configured' };
  }
  const result = await MailComposer.composeAsync({
    recipients: [to],
    subject: opts.subject,
    body: opts.body,
  });
  console.log('[email] composer result:', result.status);
  return {
    ok: result.status === MailComposer.MailComposerStatus.SENT,
    method: 'composer',
  };
}

export async function checkCaregiverThresholdAndAlert(): Promise<void> {
  const s = getSettings();
  const u = getUser();
  if (!u) return;
  const missed = missedInLast24h();
  if (missed < s.caregiver_threshold) return;
  await sendCaregiverEmail({
    subject: `Missed-dose alert for ${u.name}`,
    body:
      `Hello,\n\n${u.name} has missed ${missed} dose(s) in the last 24 hours, ` +
      `which is at or above the configured threshold (${s.caregiver_threshold}).\n\n` +
      `Please check on them.\n\n— Medicine Tracker`,
  });
}

export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  const u = getUser();
  const name = u?.name ?? 'Patient';
  const res = await sendCaregiverEmail({
    subject: `[TEST] Medicine Tracker alert for ${name}`,
    body: `This is a test email from Medicine Tracker for ${name}. If you received this, caregiver alerts are configured correctly.`,
  });
  return { ok: res.ok, error: res.error };
}
