import { useCallback, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Text, FAB, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { useConfirm } from '@/components/ConfirmDialog';
import { t } from '@/i18n';
import { listMedicines, deleteMedicine } from '@/db/repo';
import { Medicine } from '@/db/types';
import { palette, radius, shadow, spacing } from '@/theme';

export default function MedicinesScreen() {
  const [items, setItems] = useState<Medicine[]>([]);
  const router = useRouter();
  const { confirm } = useConfirm();

  const refresh = useCallback(() => setItems(listMedicines()), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const confirmDelete = async (
    title: string,
    body: string,
    onYes: () => void | Promise<void>,
  ) => {
    const ok = await confirm({
      title,
      message: body,
      variant: 'destructive',
      confirmLabel: t('delete'),
    });
    if (ok) await onYes();
  };

  return (
    <Screen>
      <Header
        title={t('tab_medicines')}
        subtitle={items.length ? `${items.length} in your cabinet` : 'Track and manage your medicines'}
        icon="pill"
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <EmptyState
            icon="pill"
            title="No medicines yet"
            hint="Tap the + button to add your first medicine and start tracking."
          />
        ) : null}

        {items.map((m) => {
          const low = m.stock_count <= m.low_stock_threshold;
          return (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/medicine/${m.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.avatar, low ? styles.avatarLow : styles.avatarOk]}>
                <MaterialCommunityIcons
                  name={low ? 'alert-circle' : 'pill'}
                  size={24}
                  color={low ? palette.rose : palette.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{m.name}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.tag, low ? styles.tagLow : styles.tagOk]}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={12}
                      color={low ? palette.rose : palette.brand}
                    />
                    <Text style={[styles.tagText, { color: low ? palette.rose : palette.brand }]}>
                      {t('current_stock', { n: m.stock_count })}
                    </Text>
                  </View>
                  {low && (
                    <View style={[styles.tag, styles.tagWarn]}>
                      <MaterialCommunityIcons name="alert" size={12} color={palette.rose} />
                      <Text style={[styles.tagText, { color: palette.rose }]}>{t('low_stock')}</Text>
                    </View>
                  )}
                </View>
              </View>
              <IconButton
                icon="pencil-outline"
                size={20}
                onPress={() => router.push(`/medicine/${m.id}`)}
              />
              <IconButton
                icon="trash-can-outline"
                size={20}
                iconColor={palette.rose}
                onPress={() =>
                  confirmDelete(t('delete'), m.name, () => {
                    deleteMedicine(m.id);
                    refresh();
                  })
                }
              />
            </Pressable>
          );
        })}
      </ScrollView>
      <FAB
        icon="plus"
        label={t('add')}
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => router.push('/medicine/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: 140 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  avatar: {
    width: 46, height: 46, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOk: { backgroundColor: palette.brandSoft },
  avatarLow: { backgroundColor: palette.roseSoft },
  title: { fontSize: 15, fontWeight: '700', color: palette.ink },
  metaRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagOk:   { backgroundColor: palette.brandSoft },
  tagLow:  { backgroundColor: palette.roseSoft },
  tagWarn: { backgroundColor: palette.roseSoft },
  tagText: { fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 96,
    backgroundColor: palette.brand,
    borderRadius: radius.pill,
    ...shadow.brand,
  },
});
