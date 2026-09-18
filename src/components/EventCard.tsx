import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReminderStatus } from '@/db/types';
import { palette, radius, shadow, spacing, statusPalette } from '@/theme';
import { fmtTime } from '@/utils/date';
import { t } from '@/i18n';

interface Props {
  eventId: number;
  medName: string;
  doseQty: number;
  dueAt: string;
  status: ReminderStatus;
  onTook: () => void;
  onSkip: () => void;
  onLater: () => void;
  onDelete: () => void;
}

export function EventCard(p: Props) {
  const s = statusPalette[p.status];
  const actionable = p.status === 'pending' || p.status === 'snoozed';
  return (
    <View style={styles.card}>
      <View style={[styles.rail, { backgroundColor: s.main }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: s.soft }]}>
            <MaterialCommunityIcons name="pill" size={22} color={s.main} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.time}>{fmtTime(p.dueAt)}</Text>
              <View style={styles.dot} />
              <Text style={styles.name} numberOfLines={1}>{p.medName}</Text>
            </View>
            <Text style={styles.meta}>x{p.doseQty}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: s.soft }]}>
            <Text style={[styles.badgeText, { color: s.label }]}>
              {t(`status_${p.status}`)}
            </Text>
          </View>

          <IconButton icon="close" size={18} onPress={p.onDelete} style={styles.closeBtn} />
        </View>

        {actionable && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              icon="check-bold"
              onPress={p.onTook}
              style={styles.btn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              {t('took_it')}
            </Button>
            <Button
              mode="outlined"
              icon="close-thick"
              onPress={p.onSkip}
              style={[styles.btn, styles.btnOutlined]}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabelOutlined}
              textColor={palette.inkMuted}
            >
              {t('skip')}
            </Button>
            <Button
              mode="outlined"
              icon="clock-outline"
              onPress={p.onLater}
              style={[styles.btn, styles.btnOutlined]}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabelOutlined}
              textColor={palette.brand}
            >
              {t('later')}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  rail: { width: 5 },
  body: { flex: 1, padding: spacing.md, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { fontSize: 15, fontWeight: '800', color: palette.ink, letterSpacing: 0.2 },
  dot: { width: 3, height: 3, borderRadius: 999, backgroundColor: palette.inkSoft },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: palette.ink },
  meta: { fontSize: 12, color: palette.inkMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: { margin: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, borderRadius: radius.pill },
  btnOutlined: { borderColor: palette.outline, backgroundColor: palette.surfaceAlt },
  btnContent: { paddingVertical: 4 },
  btnLabel: { fontWeight: '700', letterSpacing: 0.2 },
  btnLabelOutlined: { fontWeight: '600' },
});
