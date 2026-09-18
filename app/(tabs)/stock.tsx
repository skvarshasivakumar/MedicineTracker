import { useCallback, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { listMedicines, setStock } from '@/db/repo';
import { Medicine } from '@/db/types';
import { palette, radius, shadow, spacing } from '@/theme';

export default function StockScreen() {
  const [items, setItems] = useState<Medicine[]>([]);
  const [editing, setEditing] = useState<{ id: number; mode: 'refill' | 'set'; current: number } | null>(null);
  const [value, setValue] = useState('');

  const refresh = useCallback(() => setItems(listMedicines()), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const open = (m: Medicine, mode: 'refill' | 'set') => {
    setEditing({ id: m.id, mode, current: m.stock_count });
    setValue(mode === 'set' ? String(m.stock_count) : '10');
  };

  const apply = () => {
    if (!editing) return;
    const n = Math.max(0, parseInt(value || '0', 10) || 0);
    const next = editing.mode === 'set' ? n : editing.current + n;
    setStock(editing.id, next);
    setEditing(null);
    refresh();
  };

  const lowCount = items.filter((m) => m.stock_count <= m.low_stock_threshold).length;

  return (
    <Screen>
      <Header
        title={t('tab_stock')}
        subtitle={items.length ? `${items.length} tracked • ${lowCount} low` : 'Keep an eye on your supplies'}
        icon="package-variant-closed"
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <EmptyState
            icon="package-variant-closed"
            title="No stock to show"
            hint="Add medicines to start tracking their stock levels here."
          />
        ) : null}

        {items.map((m) => {
          const low = m.stock_count <= m.low_stock_threshold;
          const target = Math.max(m.low_stock_threshold * 4, 10);
          const pct = Math.max(4, Math.min(100, (m.stock_count / target) * 100));
          return (
            <View key={m.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={[styles.avatar, low ? styles.avatarLow : styles.avatarOk]}>
                  <MaterialCommunityIcons
                    name={low ? 'alert-decagram-outline' : 'package-variant'}
                    size={22}
                    color={low ? palette.rose : palette.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.meta}>
                    {t('current_stock', { n: m.stock_count })} • min {m.low_stock_threshold}
                  </Text>
                </View>
                {low ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t('low_stock').toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: low ? palette.rose : palette.brand },
                  ]}
                />
              </View>
              <View style={styles.actions}>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => open(m, 'refill')}
                  style={styles.btn}
                  contentStyle={styles.btnContent}
                  labelStyle={styles.btnLabel}
                >
                  {t('refill')}
                </Button>
                <Button
                  mode="outlined"
                  icon="pencil-outline"
                  onPress={() => open(m, 'set')}
                  style={[styles.btn, styles.btnOutlined]}
                  contentStyle={styles.btnContent}
                  labelStyle={styles.btnLabelOutlined}
                  textColor={palette.brand}
                >
                  {t('set')}
                </Button>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={editing !== null} onDismiss={() => setEditing(null)} style={styles.dialog}>
          <Dialog.Title>{editing?.mode === 'refill' ? t('refill_amount') : t('set_amount')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="off"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>{t('cancel')}</Button>
            <Button mode="contained" onPress={apply}>{t('save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: 120 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOk:  { backgroundColor: palette.brandSoft },
  avatarLow: { backgroundColor: palette.roseSoft },
  title: { fontSize: 15, fontWeight: '700', color: palette.ink },
  meta: { fontSize: 12, color: palette.inkMuted, marginTop: 2 },
  badge: {
    backgroundColor: palette.roseSoft,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#9F1239' },
  progressTrack: {
    height: 8,
    backgroundColor: palette.outlineSoft,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, borderRadius: radius.pill },
  btnOutlined: { borderColor: palette.outline, backgroundColor: palette.surfaceAlt },
  btnContent: { paddingVertical: 4 },
  btnLabel: { fontWeight: '700' },
  btnLabelOutlined: { fontWeight: '600' },
  dialog: { borderRadius: radius.lg, backgroundColor: palette.surface },
});
