import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { MedicineForm, MedicineFormValue, defaultMedicineForm } from '@/components/MedicineForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { t } from '@/i18n';
import { insertMedicine, replaceSchedules } from '@/db/repo';
import { bootSchedulerOnce } from '@/services/scheduler';
import { palette, radius, shadow } from '@/theme';

export default function NewMedicine() {
  const [form, setForm] = useState<MedicineFormValue>(defaultMedicineForm());
  const router = useRouter();
  const { alert } = useConfirm();

  const save = async () => {
    if (!form.name.trim()) { void alert({ title: t('med_name'), variant: 'warning' }); return; }
    const id = insertMedicine({
      name: form.name.trim(),
      notify_style: form.notify_style,
      frequency_type: form.frequency_type,
      weekdays: form.frequency_type === 'weekdays' ? form.weekdays : null,
      month_day: form.frequency_type === 'monthday' ? form.month_day : null,
      food_relation: form.food_relation,
      stock_count: form.stock_count,
      low_stock_threshold: form.low_stock_threshold,
      voice_clip: form.voice_clip || null,
    });
    replaceSchedules(
      id,
      form.schedules.map((s) => ({
        shift: s.shift, time_hhmm: s.time_hhmm, dose_qty: s.dose_qty, enabled: s.enabled ? 1 : 0,
      })),
    );
    await bootSchedulerOnce();
    router.back();
  };

  return (
    <Screen>
      <Header title={t('add')} subtitle={t('tab_medicines')} icon="pill" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16, gap: 12, paddingBottom: 40 }}>
        <MedicineForm value={form} onChange={setForm} />
        <Button
          mode="contained"
          icon="content-save"
          onPress={save}
          style={{ borderRadius: radius.pill, backgroundColor: palette.brand, marginTop: 8, ...shadow.brand }}
          contentStyle={{ paddingVertical: 4 }}
          labelStyle={{ fontWeight: '700' }}
        >
          {t('save')}
        </Button>
        <Button onPress={() => router.back()} textColor={palette.inkMuted}>{t('cancel')}</Button>
      </ScrollView>
    </Screen>
  );
}
