import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { AppointmentForm, ApptFormValue } from '@/components/AppointmentForm';
import { t } from '@/i18n';
import { getAppointment, updateAppointment } from '@/db/repo';
import { bootSchedulerOnce } from '@/services/scheduler';
import { cancelNotification } from '@/services/notifications';
import { palette } from '@/theme';

export default function EditAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const apptId = parseInt(id ?? '0', 10);
  const [form, setForm] = useState<ApptFormValue | null>(null);

  useEffect(() => {
    const a = getAppointment(apptId);
    if (!a) { router.back(); return; }
    setForm({ doctor_name: a.doctor_name, when_at: a.when_at, notes: a.notes ?? '' });
  }, [apptId, router]);

  if (!form) return <ActivityIndicator style={{ marginTop: 60 }} color={palette.brand} />;

  const save = async () => {
    const existing = getAppointment(apptId);
    if (!existing) return;
    await cancelNotification(existing.notification_id);
    updateAppointment({
      ...existing,
      doctor_name: form.doctor_name.trim(),
      when_at: form.when_at,
      notes: form.notes || null,
      notification_id: null,
    });
    await bootSchedulerOnce();
    router.back();
  };

  return (
    <Screen>
      <Header title={t('edit_appointment')} icon="calendar-edit" />
      <AppointmentForm value={form} onChange={setForm} onSubmit={save} onCancel={() => router.back()} />
    </Screen>
  );
}
