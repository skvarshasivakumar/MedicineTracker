import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { MedicineForm, MedicineFormValue, defaultMedicineForm } from '@/components/MedicineForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { t } from '@/i18n';
import {
  getMedicine,
  listSchedules,
  updateMedicine,
  replaceSchedules,
} from '@/db/repo';
import { bootSchedulerOnce } from '@/services/scheduler';
import { palette, radius, shadow } from '@/theme';

export default function EditMedicine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const medId = parseInt(id ?? '0', 10);
  const [form, setForm] = useState<MedicineFormValue | null>(null);
  const { alert } = useConfirm();

  const loadMedicine = useCallback(() => {
    console.log('[EditMedicine] loading medicine id=', medId);
    const m = getMedicine(medId);
    if (!m) { router.back(); return; }
    console.log('[EditMedicine] loaded medicine:', m.name, 'stock:', m.stock_count);
    const schedules = listSchedules(medId);
    const base = defaultMedicineForm();
    const merged: MedicineFormValue = {
      name: m.name,
      notify_style: m.notify_style,
      frequency_type: m.frequency_type,
      weekdays: m.weekdays ?? '',
      month_day: m.month_day ?? 1,
      food_relation: m.food_relation,
      stock_count: m.stock_count,
      low_stock_threshold: m.low_stock_threshold,
      voice_clip: m.voice_clip ?? '',
      schedules: base.schedules.map((b) => {
        const existing = schedules.find((s) => s.shift === b.shift);
        return existing
          ? {
              shift: b.shift,
              time_hhmm: existing.time_hhmm,
              dose_qty: existing.dose_qty,
              enabled: existing.enabled === 1,
            }
          : { ...b, enabled: false };
      }),
    };
    setForm(merged);
  }, [medId, router]);

  // Reload medicine data every time this screen comes into focus
  useFocusEffect(useCallback(() => {
    loadMedicine();
  }, [loadMedicine]));

  if (!form) return <ActivityIndicator style={{ marginTop: 60 }} color={palette.brand} />;

  const save = async () => {
    if (!form.name.trim()) { void alert({ title: t('med_name'), variant: 'warning' }); return; }
    updateMedicine({
      id: medId,
      created_at: '',
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
      medId,
      form.schedules.map((s) => ({
        shift: s.shift, time_hhmm: s.time_hhmm, dose_qty: s.dose_qty, enabled: s.enabled ? 1 : 0,
      })),
    );
    await bootSchedulerOnce();
    router.back();
  };

  return (
    <Screen>
      <Header title={t('edit')} subtitle={form.name} icon="pill" />
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
