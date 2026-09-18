import { useState } from 'react';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { AppointmentForm, ApptFormValue } from '@/components/AppointmentForm';
import { useRouter } from 'expo-router';
import { t } from '@/i18n';
import { insertAppointment } from '@/db/repo';
import { bootSchedulerOnce } from '@/services/scheduler';

export default function NewAppointment() {
  const router = useRouter();
  const [form, setForm] = useState<ApptFormValue>({
    doctor_name: '',
    when_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    notes: '',
  });

  const save = async () => {
    insertAppointment({
      doctor_name: form.doctor_name.trim(),
      when_at: form.when_at,
      notes: form.notes || null,
      status: 'pending',
      notification_id: null,
    });
    await bootSchedulerOnce();
    router.back();
  };

  return (
    <Screen>
      <Header title={t('new_appointment')} icon="calendar-plus" />
      <AppointmentForm value={form} onChange={setForm} onSubmit={save} onCancel={() => router.back()} />
    </Screen>
  );
}
