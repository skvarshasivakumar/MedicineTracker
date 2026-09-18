import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { useConfirm } from '@/components/ConfirmDialog';
import { t, setLocale } from '@/i18n';
import { createUser, insertMedicine, replaceSchedules } from '@/db/repo';
import { useUserStore } from '@/stores/userStore';
import { bootSchedulerOnce } from '@/services/scheduler';
import { MedicineForm, MedicineFormValue, defaultMedicineForm } from '@/components/MedicineForm';
import { palette, radius, shadow, spacing } from '@/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [phone, setPhone] = useState('');
  const [form, setForm] = useState<MedicineFormValue>(defaultMedicineForm());
  const { alert } = useConfirm();

  const onLangChange = (v: string) => {
    const lv = v as 'en' | 'ta';
    setLang(lv);
    setLocale(lv);
  };

  const finish = async () => {
    if (!name.trim()) {
      void alert({ title: t('onb_welcome'), message: t('onb_name'), variant: 'warning' });
      return;
    }
    if (!form.name.trim() || form.schedules.length === 0) {
      void alert({ title: t('onb_first_medicine'), message: t('med_name'), variant: 'warning' });
      return;
    }
    const user = createUser(name.trim(), lang, phone.trim() || null);
    setUser(user);

    const medId = insertMedicine({
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
        shift: s.shift,
        time_hhmm: s.time_hhmm,
        dose_qty: s.dose_qty,
        enabled: s.enabled ? 1 : 0,
      })),
    );
    await bootSchedulerOnce();
    router.replace('/');
  };

  return (
    <Screen>
      <Header title={t('onb_welcome')} subtitle="Let's set things up in a minute" icon="heart-pulse" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <SectionHeader icon="account-circle-outline" title={t('onb_welcome')} />
          <View style={styles.cardBody}>
            <TextInput mode="outlined" label={t('onb_name')} value={name} onChangeText={setName} />
            <Text style={styles.label}>{t('onb_language')}</Text>
            <SegmentedButtons
              value={lang}
              onValueChange={onLangChange}
              buttons={[
                { value: 'en', label: 'English' },
                { value: 'ta', label: 'தமிழ்' },
              ]}
            />
            <TextInput
              mode="outlined"
              label={t('onb_caregiver_phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader icon="medical-bag" title={t('onb_first_medicine')} />
          <View style={styles.cardBody}>
            <MedicineForm value={form} onChange={setForm} />
          </View>
        </View>

        <Button
          mode="contained"
          icon="rocket-launch-outline"
          onPress={finish}
          style={styles.finish}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '800', letterSpacing: 0.3 }}
        >
          {t('onb_finish')}
        </Button>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={palette.brand} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  card: { backgroundColor: palette.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  cardBody: { padding: spacing.md, gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  sectionIcon: {
    width: 34, height: 34, borderRadius: radius.md, backgroundColor: palette.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.ink },
  label: { fontSize: 12, fontWeight: '600', color: palette.inkMuted },
  finish: { borderRadius: radius.pill, backgroundColor: palette.brand, ...shadow.brand },
});
