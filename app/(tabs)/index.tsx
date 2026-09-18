import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { Text, Button, TextInput, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { AppointmentCard } from '@/components/AppointmentCard';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  todaysEvents,
  todaysAppointments,
  setAppointmentStatus,
  deleteEvent,
  deleteAppointment,
  deleteTodaysEvents,
} from '@/db/repo';
import { actionTook, actionSkip, actionLater, bootSchedulerOnce } from '@/services/scheduler';
import { speak } from '@/services/voice';
import { cancelAll } from '@/services/notifications';
import { getUser } from '@/db/repo';
import { t } from '@/i18n';
import { palette, radius, shadow, spacing } from '@/theme';

const INITIAL_LIMIT = 10;

export default function HomeScreen() {
  const [events, setEvents] = useState<ReturnType<typeof todaysEvents>>([]);
  const [appts, setAppts] = useState<ReturnType<typeof todaysAppointments>>([]);
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [refreshing, setRefreshing] = useState(false);
  const [laterFor, setLaterFor] = useState<number | null>(null);
  const [laterMin, setLaterMin] = useState('10');
  const { confirm } = useConfirm();

  const refresh = useCallback(async () => {
    const evs = todaysEvents();
    const seen = new Set<number>();
    setEvents(evs.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))));
    const apts = todaysAppointments();
    const seenA = new Set<number>();
    setAppts(apts.filter((a) => (seenA.has(a.id) ? false : (seenA.add(a.id), true))));
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await bootSchedulerOnce();
    await refresh();
    setRefreshing(false);
  };

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

  const items: Array<
    | { kind: 'event'; data: (typeof events)[number]; sortKey: string }
    | { kind: 'appt'; data: (typeof appts)[number]; sortKey: string }
  > = [
    ...events.map((e) => ({ kind: 'event' as const, data: e, sortKey: e.due_at ?? '' })),
    ...appts.map((a) => ({ kind: 'appt' as const, data: a, sortKey: a.when_at ?? '' })),
  ].sort((a, b) => (a.sortKey ?? '').localeCompare(b.sortKey ?? ''));

  const visible = items.slice(0, limit);
  const overflow = items.length - visible.length;

  const stats = useMemo(() => {
    const total = events.length;
    const taken = events.filter((e) => e.status === 'taken').length;
    const pending = events.filter((e) => e.status === 'pending' || e.status === 'snoozed').length;
    const missed = events.filter((e) => e.status === 'missed').length;
    return { total, taken, pending, missed, appts: appts.length };
  }, [events, appts]);

  const user = getUser();
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const subtitle = `${greet}${user?.name ? `, ${user.name.split(' ')[0]}` : ''} • ${format(new Date(), 'EEE, MMM d')}`;

  return (
    <Screen>
      <Header title={t('home_title')} subtitle={subtitle} icon="clipboard-pulse-outline" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brand} />}
      >
        <View style={styles.statsRow}>
          <StatPill icon="check-decagram" tint={palette.mint} tintSoft={palette.mintSoft} label="Taken" value={stats.taken} />
          <StatPill icon="bell-ring-outline" tint={palette.sky} tintSoft={palette.skySoft} label="Pending" value={stats.pending} />
          <StatPill icon="alert-decagram-outline" tint={palette.rose} tintSoft={palette.roseSoft} label="Missed" value={stats.missed} />
          <StatPill icon="stethoscope" tint={palette.brand} tintSoft={palette.brandSoft} label="Doctors" value={stats.appts} />
        </View>

        <View style={styles.toolbar}>
          <ToolbarChip
            icon="volume-high"
            label="Test voice"
            onPress={() => {
              const u = getUser();
              const lang = u?.language ?? 'en';
              speak('This is a test of the medicine tracker voice.', lang);
            }}
          />
          <ToolbarChip
            icon="trash-can-outline"
            label="Clear all"
            danger
            onPress={() => {
              confirmDelete(
                t('delete'),
                "Clear ALL of today's reminders?",
                async () => {
                  deleteTodaysEvents();
                  await cancelAll();
                  await refresh();
                },
              );
            }}
          />
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="party-popper"
            title="All clear for today!"
            hint="No reminders or appointments scheduled. Enjoy your day."
          />
        ) : null}

        {visible.map((it, idx) => {
          if (it.kind === 'event') {
            const e = it.data;
            return (
              <EventCard
                key={`e-${e.id}-${idx}`}
                eventId={e.id}
                medName={e.medicine_name}
                doseQty={e.dose_qty}
                dueAt={e.due_at}
                status={e.status}
                onTook={async () => { await actionTook(e.id); await refresh(); }}
                onSkip={async () => { await actionSkip(e.id); await refresh(); }}
                onLater={() => { setLaterFor(e.id); setLaterMin('10'); }}
                onDelete={() => {
                  confirmDelete(t('delete'), e.medicine_name, async () => {
                    deleteEvent(e.id);
                    await refresh();
                  });
                }}
              />
            );
          }
          const a = it.data;
          return (
            <AppointmentCard
              key={`a-${a.id}-${idx}`}
              doctor={a.doctor_name}
              whenAt={a.when_at}
              notes={a.notes}
              status={a.status}
              onVisited={async () => { setAppointmentStatus(a.id, 'visited'); await refresh(); }}
              onNotGoing={async () => { setAppointmentStatus(a.id, 'skipped'); await refresh(); }}
              onEdit={() => {/* edit from Appointments screen */}}
              onDelete={() => {
                confirmDelete(t('delete'), a.doctor_name, async () => {
                  deleteAppointment(a.id);
                  await refresh();
                });
              }}
            />
          );
        })}

        {overflow > 0 && (
          <Button onPress={() => setLimit(items.length)} textColor={palette.brand}>
            {t('show_more', { n: overflow })}
          </Button>
        )}
        {limit > INITIAL_LIMIT && items.length > INITIAL_LIMIT && (
          <Button onPress={() => setLimit(INITIAL_LIMIT)} textColor={palette.brand}>
            {t('show_less')}
          </Button>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={laterFor !== null} onDismiss={() => setLaterFor(null)} style={styles.dialog}>
          <Dialog.Title>{t('later')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Minutes"
              value={laterMin}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="off"
              onChangeText={(v) => setLaterMin(v.replace(/[^0-9]/g, ''))}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLaterFor(null)}>{t('cancel')}</Button>
            <Button
              mode="contained"
              onPress={async () => {
                const m = Math.max(1, parseInt(laterMin || '10', 10) || 10);
                if (laterFor != null) await actionLater(laterFor, m);
                setLaterFor(null);
                await refresh();
              }}
            >
              {t('confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function StatPill({
  icon,
  tint,
  tintSoft,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
  tintSoft: string;
  label: string;
  value: number;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: palette.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: tintSoft }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ToolbarChip({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? palette.rose : palette.brand;
  const bg = danger ? palette.roseSoft : palette.brandSoft;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    ...shadow.xs,
  },
  statIcon: {
    width: 30, height: 30,
    borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '800', color: palette.ink },
  statLabel: { fontSize: 10, color: palette.inkMuted, fontWeight: '600', letterSpacing: 0.3 },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  chipLabel: { fontSize: 13, fontWeight: '700' },
  dialog: { borderRadius: radius.lg, backgroundColor: palette.surface },
});
