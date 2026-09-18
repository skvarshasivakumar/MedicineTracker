import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { AppointmentCard } from '@/components/AppointmentCard';
import { useConfirm } from '@/components/ConfirmDialog';
import { t } from '@/i18n';
import {
  listAppointments,
  deleteAppointment,
  setAppointmentStatus,
} from '@/db/repo';
import { Appointment } from '@/db/types';
import { cancelNotification } from '@/services/notifications';
import { palette, radius, shadow, spacing } from '@/theme';

export default function AppointmentsScreen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const router = useRouter();
  const { confirm } = useConfirm();

  const refresh = useCallback(() => setItems(listAppointments()), []);
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
        title={t('tab_appointments')}
        subtitle={items.length ? `${items.length} scheduled` : 'Never miss a check-up'}
        icon="stethoscope"
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <EmptyState
            icon="calendar-heart"
            title="No doctor visits yet"
            hint="Tap + to schedule your first appointment reminder."
          />
        ) : null}

        {items.map((a) => (
          <AppointmentCard
            key={a.id}
            doctor={a.doctor_name}
            whenAt={a.when_at}
            notes={a.notes}
            status={a.status}
            onVisited={() => { setAppointmentStatus(a.id, 'visited'); refresh(); }}
            onNotGoing={() => { setAppointmentStatus(a.id, 'skipped'); refresh(); }}
            onEdit={() => router.push(`/appointment/${a.id}`)}
            onDelete={() => {
              confirmDelete(t('delete'), a.doctor_name, async () => {
                await cancelNotification(a.notification_id);
                deleteAppointment(a.id);
                refresh();
              });
            }}
          />
        ))}
      </ScrollView>
      <FAB
        icon="plus"
        label={t('add')}
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => router.push('/appointment/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: 140 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 96,
    backgroundColor: palette.brand,
    borderRadius: radius.pill,
    ...shadow.brand,
  },
});
