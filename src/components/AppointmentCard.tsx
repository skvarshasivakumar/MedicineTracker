import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppointmentStatus } from '@/db/types';
import { fmtDateTime } from '@/utils/date';
import { palette, radius, shadow, spacing, statusPalette } from '@/theme';
import { t } from '@/i18n';

const STATUS_MAP: Record<AppointmentStatus, keyof typeof statusPalette> = {
  pending: 'pending',
  visited: 'taken',
  skipped: 'skipped',
};

interface Props {
  doctor: string;
  whenAt: string;
  notes?: string | null;
  status: AppointmentStatus;
  onVisited: () => void;
  onNotGoing: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AppointmentCard(p: Props) {
  const s = statusPalette[STATUS_MAP[p.status]];
  const actionable = p.status === 'pending';
  return (
    <View style={styles.card}>
      <View style={[styles.rail, { backgroundColor: s.main }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: s.soft }]}>
            <MaterialCommunityIcons name="stethoscope" size={22} color={s.main} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{p.doctor}</Text>
            <Text style={styles.meta}>{fmtDateTime(p.whenAt)}</Text>
            {p.notes ? <Text style={styles.notes} numberOfLines={2}>{p.notes}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: s.soft }]}>
            <Text style={[styles.badgeText, { color: s.label }]}>
              {(p.status === 'visited' ? t('visited') : p.status === 'skipped' ? t('not_going') : t('status_pending')).toUpperCase()}
            </Text>
          </View>
          <IconButton icon="pencil-outline" size={18} onPress={p.onEdit} style={styles.iconBtn} />
          <IconButton icon="close" size={18} onPress={p.onDelete} style={styles.iconBtn} />
        </View>

        {actionable && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              icon="check-bold"
              onPress={p.onVisited}
              style={styles.btn}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              {t('visited')}
            </Button>
            <Button
              mode="outlined"
              icon="close-thick"
              onPress={p.onNotGoing}
              style={[styles.btn, styles.btnOutlined]}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabelOutlined}
              textColor={palette.inkMuted}
            >
              {t('not_going')}
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
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: palette.ink },
  meta: { fontSize: 12, color: palette.inkMuted, marginTop: 2 },
  notes: { fontSize: 12, color: palette.inkSoft, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  iconBtn: { margin: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, borderRadius: radius.pill },
  btnOutlined: { borderColor: palette.outline, backgroundColor: palette.surfaceAlt },
  btnContent: { paddingVertical: 4 },
  btnLabel: { fontWeight: '700', letterSpacing: 0.2 },
  btnLabelOutlined: { fontWeight: '600' },
});
