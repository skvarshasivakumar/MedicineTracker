import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Platform, Pressable } from 'react-native';
import {
  TextInput, Button, SegmentedButtons, Text, Divider, ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { useConfirm } from '@/components/ConfirmDialog';
import { t, setLocale } from '@/i18n';
import { getSettings, saveSettings, updateUser, setIntroSeen } from '@/db/repo';
import { Settings, DEFAULT_SETTINGS } from '@/db/types';
import { useUserStore } from '@/stores/userStore';
import { sendTestEmail } from '@/services/email';
import { palette, radius, shadow, spacing } from '@/theme';

type NumKeys = {
  [K in keyof Settings]: Settings[K] extends number ? K : never
}[keyof Settings];

const NUM_FIELDS: { key: NumKeys; label: string }[] = [
  { key: 'auto_renotify_minutes', label: 'auto_renotify' },
  { key: 'skip_renotify_minutes', label: 'skip_renotify' },
  { key: 'max_snoozes_per_dose', label: 'max_snoozes' },
  { key: 'caregiver_threshold', label: 'caregiver_threshold' },
  { key: 'appointment_lead_hours', label: 'appointment_lead' },
];

export default function SettingsScreen() {
  const { user, refresh } = useUserStore();
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [loading, setLoading] = useState(true);
  const { alert: showAlert } = useConfirm();
  const router = useRouter();

  useEffect(() => {
    setS(getSettings());
    if (user) {
      setName(user.name);
      setPhone(user.caregiver_phone ?? '');
      setLang(user.language);
    }
    setLoading(false);
  }, [user]);

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color={palette.brand} />;

  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    saveSettings(s);
    if (user) {
      updateUser({ id: user.id, name, language: lang, caregiver_phone: phone || null });
      setLocale(lang);
      refresh();
    }
    void showAlert({ title: t('save'), message: 'Your settings were saved.', variant: 'success' });
  };

  const test = async () => {
    const r = await sendTestEmail();
    void showAlert({
      title: r.ok ? t('test_email_sent') : t('test_email_failed'),
      message: r.error ?? (r.ok ? 'Email sent successfully!' : 'Failed to send email'),
      variant: r.ok ? 'success' : 'warning',
    });
  };

  return (
    <Screen>
      <Header title={t('settings_title')} subtitle="Personalize your experience" icon="cog-outline" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section icon="account-circle-outline" title={t('onb_welcome')}>
          <TextInput mode="outlined" label={t('onb_name')} value={name} onChangeText={setName} />
          <Text style={styles.label}>{t('onb_language')}</Text>
          <SegmentedButtons
            value={lang}
            onValueChange={(v) => setLang(v as 'en' | 'ta')}
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
        </Section>

        <Section icon="tune-vertical" title="Reminder timing">
          {NUM_FIELDS.map(({ key, label }) => (
            <TextInput
              key={key}
              mode="outlined"
              label={t(label)}
              value={String(s[key])}
              onChangeText={(v) => upd(key, (parseInt(v || '0', 10) || 0) as Settings[typeof key])}
              keyboardType="number-pad"
            />
          ))}
        </Section>

        <Section icon="email-outline" title="Caregiver alerts">
          <TextInput mode="outlined" label={t('caregiver_email')} value={s.caregiver_email}
            autoCapitalize="none" keyboardType="email-address"
            onChangeText={(v) => upd('caregiver_email', v)} />
          <TextInput mode="outlined" label={t('sender_email')} value={s.sender_email}
            autoCapitalize="none" keyboardType="email-address"
            onChangeText={(v) => upd('sender_email', v)} />
          <TextInput mode="outlined" label={t('sender_password')} value={s.sender_email_password}
            secureTextEntry onChangeText={(v) => upd('sender_email_password', v)} />
          <TextInput mode="outlined" label={t('resend_api_key')} value={s.resend_api_key}
            secureTextEntry onChangeText={(v) => upd('resend_api_key', v)} />
          {Platform.OS === 'web' && (
            <View style={styles.notice}>
              <MaterialCommunityIcons name="information-outline" size={16} color={palette.amber} />
              <Text style={styles.noticeText}>
                Email alerts work on the native mobile app only (browser CORS blocks API calls). Build the APK to test email.
              </Text>
            </View>
          )}
          <Button
            mode="outlined"
            icon="send-outline"
            onPress={test}
            style={styles.testBtn}
            textColor={palette.brand}
          >
            {t('send_test_email')}
          </Button>
        </Section>

        <Section icon="volume-high" title="Voice">
          <TextInput mode="outlined" label={t('appointment_voice_clip')} value={s.appointment_voice_clip}
            onChangeText={(v) => upd('appointment_voice_clip', v)} />
          <TextInput mode="outlined" label={t('low_stock_voice_clip')} value={s.low_stock_voice_clip}
            onChangeText={(v) => upd('low_stock_voice_clip', v)} />
        </Section>

        <Pressable
          onPress={() => { setIntroSeen(false); router.push('/welcome'); }}
          style={({ pressed }) => [styles.aboutRow, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: palette.brandSoft }}
        >
          <View style={styles.aboutIcon}>
            <MaterialCommunityIcons name="information-outline" size={20} color={palette.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboutTitle}>{t('about_app')}</Text>
            <Text style={styles.aboutSub}>{t('welcome_credits_title')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.inkSoft} />
        </Pressable>

        <Button
          mode="contained"
          icon="content-save"
          onPress={save}
          style={styles.saveBtn}
          contentStyle={{ paddingVertical: 4 }}
          labelStyle={{ fontWeight: '700', letterSpacing: 0.3 }}
        >
          {t('save')}
        </Button>
      </ScrollView>
    </Screen>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <MaterialCommunityIcons name={icon} size={20} color={palette.brand} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Divider style={{ backgroundColor: palette.outlineSoft }} />
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: 140, gap: spacing.md },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: palette.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.ink },
  sectionBody: { padding: spacing.md, gap: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: palette.inkMuted, marginTop: 4 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.amberSoft,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 16 },
  testBtn: { borderColor: palette.outline, borderRadius: radius.pill, backgroundColor: palette.surfaceAlt },
  saveBtn: {
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    backgroundColor: palette.brand,
    ...shadow.brand,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
    ...shadow.sm,
  },
  aboutIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  aboutTitle: { fontWeight: '700', color: palette.ink, fontSize: 14.5 },
  aboutSub:   { fontSize: 12, color: palette.inkMuted, marginTop: 2 },
});
