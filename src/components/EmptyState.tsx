import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, spacing } from '@/theme';

interface Props {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  hint?: string;
}

/** Friendly empty-state placeholder with a big soft-tinted icon. */
export function EmptyState({ icon, title, hint }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconRing}>
        <MaterialCommunityIcons name={icon} size={44} color={palette.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: palette.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.ink,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: palette.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
