import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Constants from 'expo-constants';
import { Screen } from '@/components/Screen';
import { setIntroSeen } from '@/db/repo';
import { palette, radius, shadow, spacing } from '@/theme';
import { t } from '@/i18n';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Feature { icon: IconName; title: string; desc: string; tint: string; tintSoft: string; }
interface Chip    { icon: IconName; label: string; }

export default function WelcomeScreen() {
  const router = useRouter();
  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const features: Feature[] = useMemo(() => ([
    { icon: 'pill',                title: t('welcome_feat_schedules_title'), desc: t('welcome_feat_schedules_desc'), tint: palette.brand,  tintSoft: palette.brandSoft },
    { icon: 'bell-ring-outline',   title: t('welcome_feat_voice_title'),     desc: t('welcome_feat_voice_desc'),     tint: palette.amber,  tintSoft: palette.amberSoft },
    { icon: 'stethoscope',         title: t('welcome_feat_doctors_title'),   desc: t('welcome_feat_doctors_desc'),   tint: palette.sky,    tintSoft: palette.skySoft   },
    { icon: 'chart-line-variant',  title: t('welcome_feat_stock_title'),     desc: t('welcome_feat_stock_desc'),     tint: palette.mint,   tintSoft: palette.mintSoft  },
  ]), []);

  const chips: Chip[] = useMemo(() => ([
    { icon: 'translate',            label: t('welcome_extra_bilingual') },
    { icon: 'email-alert-outline',  label: t('welcome_extra_caregiver') },
    { icon: 'shield-check-outline', label: t('welcome_extra_privacy') },
  ]), []);

  const techStack = [
    'React Native', 'Expo SDK 51', 'TypeScript',
    'SQLite', 'expo-notifications', 'expo-speech', 'RN Paper',
  ];

  const proceed = () => {
    setIntroSeen(true);
    router.replace('/onboarding');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ---------- Hero ---------- */}
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.hero}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%"   stopColor={palette.heroTop} />
                  <Stop offset="55%"  stopColor={palette.heroMid} />
                  <Stop offset="100%" stopColor={palette.heroBottom} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#welcomeGrad)" />
            </Svg>

            <View style={styles.blobA} pointerEvents="none" />
            <View style={styles.blobB} pointerEvents="none" />
            <View style={styles.blobC} pointerEvents="none" />

            <View style={styles.badge}>
              <MaterialCommunityIcons name="heart-pulse" size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{t('welcome_title')}</Text>
            <Text style={styles.heroTagline}>{t('welcome_tagline')}</Text>
          </View>
        </SafeAreaView>

        {/* ---------- Purpose ---------- */}
        <View style={styles.purposeCard}>
          <View style={styles.purposeIcon}>
            <MaterialCommunityIcons name="hand-heart-outline" size={22} color={palette.brand} />
          </View>
          <Text style={styles.purposeText}>{t('welcome_purpose')}</Text>
        </View>

        {/* ---------- Features grid ---------- */}
        <Text style={styles.sectionTitle}>{t('welcome_features_title')}</Text>
        <View style={styles.grid}>
          {features.map((f) => (
            <View key={f.title} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: f.tintSoft, borderColor: f.tint }]}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.tint} />
              </View>
              <Text style={styles.tileTitle}>{f.title}</Text>
              <Text style={styles.tileDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Extra chips ---------- */}
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c.label} style={styles.chip}>
              <MaterialCommunityIcons name={c.icon} size={14} color={palette.brandDark} />
              <Text style={styles.chipLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Credits ---------- */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsIcon}>
            <MaterialCommunityIcons name="heart" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.creditsTitle}>{t('welcome_credits_title')}</Text>
          <Text style={styles.creditsSubtitle}>{t('welcome_credits_subtitle')}</Text>
          <View style={styles.versionPill}>
            <MaterialCommunityIcons name="tag-outline" size={12} color={palette.inkMuted} />
            <Text style={styles.versionText}>{t('welcome_version', { v: version })}</Text>
          </View>
        </View>

        {/* ---------- Tech stack ---------- */}
        <Text style={styles.sectionTitle}>{t('welcome_tech_title')}</Text>
        <View style={styles.techWrap}>
          {techStack.map((tech) => (
            <View key={tech} style={styles.techChip}>
              <Text style={styles.techLabel}>{tech}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.techTagline}>{t('welcome_tech_tagline')}</Text>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ---------- Sticky CTA ---------- */}
      <SafeAreaView edges={['bottom']} style={styles.ctaSafe}>
        <View style={styles.ctaWrap}>
          <Pressable
            onPress={proceed}
            style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaPressed]}
            android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
          >
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%"   stopColor={palette.brandDeep} />
                  <Stop offset="100%" stopColor={palette.brand} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx={28} ry={28} fill="url(#ctaGrad)" />
            </Svg>
            <Text style={styles.ctaText}>{t('welcome_cta')}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={proceed} style={styles.skipBtn} hitSlop={12}>
            <Text style={styles.skipText}>{t('welcome_skip')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
  },

  // Hero
  heroSafe: { backgroundColor: palette.heroTop },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl + spacing.md,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadow.brand,
  },
  badge: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' as any } : {}),
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroTagline: {
    color: '#FFFFFF',
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
    opacity: 0.95,
  },
  blobA: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.16)', top: -60, right: -50,
  },
  blobB: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.10)', bottom: -30, left: -40,
  },
  blobC: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.14)', top: 40, left: 60,
  },

  // Purpose
  purposeCard: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.xl,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
    ...shadow.md,
  },
  purposeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.brandSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  purposeText: {
    color: palette.ink,
    lineHeight: 22,
    fontSize: 14.5,
  },

  // Section titles
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    color: palette.brandDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Features grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
    ...shadow.sm,
  },
  tileIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  tileTitle: {
    fontWeight: '700',
    color: palette.ink,
    fontSize: 14.5,
    marginBottom: 2,
  },
  tileDesc: {
    color: palette.inkMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },

  // Extra chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  chipLabel: {
    color: palette.brandDark,
    fontWeight: '600',
    fontSize: 12,
  },

  // Credits
  creditsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    backgroundColor: palette.creamSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    alignItems: 'center',
    ...shadow.sm,
  },
  creditsIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: palette.brand,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.brand,
  },
  creditsTitle: {
    color: palette.brandDark,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  creditsSubtitle: {
    color: palette.inkMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
  },
  versionText: {
    fontSize: 11,
    color: palette.inkMuted,
    fontWeight: '600',
  },

  // Tech
  techWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  techChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  techLabel: {
    color: palette.brandDark,
    fontSize: 11.5,
    fontWeight: '600',
  },
  techTagline: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    fontSize: 11.5,
    color: palette.inkSoft,
    fontStyle: 'italic',
  },

  // CTA
  ctaSafe: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: 'transparent',
  },
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
    // Soft fade so scrolling content doesn't smash into the button.
    backgroundColor: 'rgba(255, 251, 235, 0.92)',
  },
  ctaBtn: {
    width: '100%',
    height: 56,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.brand,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipBtn: {
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  skipText: {
    color: palette.inkMuted,
    fontSize: 12.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
