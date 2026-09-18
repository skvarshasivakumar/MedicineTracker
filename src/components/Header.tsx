import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ReactNode } from 'react';
import { palette, radius, spacing, shadow } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  right?: ReactNode;
  children?: ReactNode;
}

/** Hero header with a real diagonal sunset gradient (pink → peach → cream). */
export function Header({ title, subtitle, icon, right, children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.hero}>
        {/* Diagonal sunset gradient */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={palette.heroTop} />
              <Stop offset="55%" stopColor={palette.heroMid} />
              <Stop offset="100%" stopColor={palette.heroBottom} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGrad)" />
        </Svg>

        {/* Decorative translucent blobs for a funky, layered feel */}
        <View style={styles.blobA} pointerEvents="none" />
        <View style={styles.blobB} pointerEvents="none" />
        <View style={styles.blobC} pointerEvents="none" />

        <View style={styles.row}>
          {icon ? (
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={icon} size={22} color="#FFFFFF" />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {children ? <View style={{ marginTop: spacing.md }}>{children}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: palette.heroTop },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(185, 62, 100, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
    textShadowColor: 'rgba(185, 62, 100, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  right: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  blobA: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  blobB: {
    position: 'absolute',
    bottom: -100,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(253,195,161,0.55)',
  },
  blobC: {
    position: 'absolute',
    top: 12,
    left: '35%',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,205,0.35)',
  },
});
