import { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fmtDateTime } from '@/utils/date';
import { useConfirm } from '@/components/ConfirmDialog';
import { WebDateTimeInput } from '@/components/WebDateTimeInput';
import { t } from '@/i18n';
import { palette, radius, shadow, spacing } from '@/theme';

export interface ApptFormValue {
  doctor_name: string;
  when_at: string; // ISO
  notes: string;
}

interface Props {
  value: ApptFormValue;
  onChange: (v: ApptFormValue) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
}

export function AppointmentForm({ value, onChange, onSubmit, onCancel }: Props) {
  const [pick, setPick] = useState<'date' | 'time' | null>(null);
  const dt = new Date(value.when_at);
  const { alert } = useConfirm();

  const setDate = (d: Date) => {
    const merged = new Date(value.when_at);
    merged.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange({ ...value, when_at: merged.toISOString() });
  };
  const setTime = (d: Date) => {
    const merged = new Date(value.when_at);
    merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
    onChange({ ...value, when_at: merged.toISOString() });
  };

  const submit = async () => {
    if (!value.doctor_name.trim()) { void alert({ title: t('doctor_name'), variant: 'warning' }); return; }
    await onSubmit();
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <TextInput
        mode="outlined"
        label={t('doctor_name')}
        value={value.doctor_name}
        onChangeText={(v) => onChange({ ...value, doctor_name: v })}
        autoComplete="off"
      />
      <Text variant="labelMedium">{t('appointment_when')}</Text>
      <View style={styles.row}>
        {Platform.OS === 'web' ? (
          <>
            <WebDateTimeInput
              label="Date"
              type="date"
              value={`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`}
              onChange={(v) => {
                const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!m) return;
                const d = new Date(value.when_at);
                d.setFullYear(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
                onChange({ ...value, when_at: d.toISOString() });
              }}
            />
            <WebDateTimeInput
              label="Time"
              type="time"
              value={`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`}
              onChange={(v) => {
                const m = v.match(/^(\d{1,2}):(\d{2})$/);
                if (!m) return;
                const d = new Date(value.when_at);
                d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
                onChange({ ...value, when_at: d.toISOString() });
              }}
            />
          </>
        ) : (
          <>
            <Pressable style={styles.half} onPress={() => setPick('date')}>
              <TextInput mode="outlined" label="Date" editable={false} value={fmtDateTime(dt).split(',')[0]} />
            </Pressable>
            <Pressable style={styles.half} onPress={() => setPick('time')}>
              <TextInput mode="outlined" label="Time" editable={false} value={fmtDateTime(dt).split(',')[1]?.trim() ?? ''} />
            </Pressable>
          </>
        )}
      </View>
      {pick && Platform.OS !== 'web' && (
        <DateTimePicker
          mode={pick}
          value={dt}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            const which = pick;
            setPick(null);
            if (!d) return;
            if (which === 'date') setDate(d);
            else setTime(d);
          }}
        />
      )}
      <TextInput
        mode="outlined"
        label={t('notes')}
        multiline
        numberOfLines={3}
        value={value.notes}
        onChangeText={(v) => onChange({ ...value, notes: v })}
        autoComplete="off"
      />
      <Button
        mode="contained"
        icon="content-save"
        onPress={submit}
        style={styles.save}
        contentStyle={{ paddingVertical: 4 }}
        labelStyle={{ fontWeight: '700', letterSpacing: 0.3 }}
      >
        {t('save')}
      </Button>
      <Button onPress={onCancel} textColor={palette.inkMuted}>{t('cancel')}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.md, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  save: {
    borderRadius: radius.pill,
    backgroundColor: palette.brand,
    marginTop: spacing.sm,
    ...shadow.brand,
  },
});
