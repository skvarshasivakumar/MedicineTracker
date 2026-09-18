import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import {
  Text,
  TextInput,
  SegmentedButtons,
  Switch,
  Divider,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { t } from '@/i18n';
import { FoodRelation, FrequencyType, NotifyStyle } from '@/db/types';
import { WebDateTimeInput } from '@/components/WebDateTimeInput';
import { palette, radius, spacing } from '@/theme';

export interface MedicineShiftValue {
  shift: 'morning' | 'afternoon' | 'night';
  time_hhmm: string;
  dose_qty: number;
  enabled: boolean;
}

export interface MedicineFormValue {
  name: string;
  notify_style: NotifyStyle;
  frequency_type: FrequencyType;
  weekdays: string;
  month_day: number;
  food_relation: FoodRelation;
  stock_count: number;
  low_stock_threshold: number;
  voice_clip: string;
  schedules: MedicineShiftValue[];
}

export function defaultMedicineForm(): MedicineFormValue {
  return {
    name: '',
    notify_style: 'name',
    frequency_type: 'daily',
    weekdays: '',
    month_day: 1,
    food_relation: 'any',
    stock_count: 30,
    low_stock_threshold: 5,
    voice_clip: '',
    schedules: [
      { shift: 'morning', time_hhmm: '08:00', dose_qty: 1, enabled: true },
      { shift: 'afternoon', time_hhmm: '14:00', dose_qty: 1, enabled: false },
      { shift: 'night', time_hhmm: '21:00', dose_qty: 1, enabled: false },
    ],
  };
}

interface Props {
  value: MedicineFormValue;
  onChange: (v: MedicineFormValue) => void;
}

export function MedicineForm({ value, onChange }: Props) {
  const set = <K extends keyof MedicineFormValue>(k: K, v: MedicineFormValue[K]) =>
    onChange({ ...value, [k]: v });

  const setShift = (i: number, patch: Partial<MedicineShiftValue>) => {
    const next = value.schedules.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...value, schedules: next });
  };

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        mode="outlined"
        label={t('med_name')}
        value={value.name}
        onChangeText={(v) => set('name', v)}
        autoComplete="off"
      />

      <Text variant="labelMedium">{t('notify_style')}</Text>
      <SegmentedButtons
        value={value.notify_style}
        onValueChange={(v) => set('notify_style', v as NotifyStyle)}
        buttons={[
          { value: 'name', label: t('notify_style_name') },
          { value: 'generic', label: t('notify_style_generic') },
        ]}
      />

      <Text variant="labelMedium">{t('frequency')}</Text>
      <SegmentedButtons
        value={value.frequency_type}
        onValueChange={(v) => set('frequency_type', v as FrequencyType)}
        buttons={[
          { value: 'daily', label: t('freq_daily') },
          { value: 'weekdays', label: t('freq_weekdays') },
          { value: 'monthday', label: t('freq_monthday') },
        ]}
      />
      {value.frequency_type === 'weekdays' && (
        <>
          <TextInput
            mode="outlined"
            label={t('freq_weekdays')}
            value={value.weekdays}
            onChangeText={(v) => set('weekdays', v)}
            placeholder="0,2,4"
            autoComplete="off"
          />
          <HelperText type="info">{t('weekdays_help')}</HelperText>
        </>
      )}
      {value.frequency_type === 'monthday' && (
        <>
          <TextInput
            mode="outlined"
            label={t('freq_monthday')}
            value={String(value.month_day)}
            onChangeText={(v) => set('month_day', Math.max(1, Math.min(31, parseInt(v || '1', 10) || 1)))}
            keyboardType="number-pad"
            autoComplete="off"
          />
          <HelperText type="info">{t('monthday_help')}</HelperText>
        </>
      )}

      <Text variant="labelMedium">{t('food_relation')}</Text>
      <SegmentedButtons
        value={value.food_relation}
        onValueChange={(v) => set('food_relation', v as FoodRelation)}
        buttons={[
          { value: 'before', label: t('food_before') },
          { value: 'after', label: t('food_after') },
          { value: 'any', label: t('food_any') },
        ]}
      />

      <View style={styles.row}>
        <NumberInput
          label={t('stock_count')}
          value={value.stock_count}
          onChange={(n) => set('stock_count', n)}
          style={styles.half}
        />
        <NumberInput
          label={t('low_stock_threshold')}
          value={value.low_stock_threshold}
          onChange={(n) => set('low_stock_threshold', n)}
          style={styles.half}
        />
      </View>

      <TextInput
        mode="outlined"
        label={t('voice_clip')}
        value={value.voice_clip}
        onChangeText={(v) => set('voice_clip', v)}
        placeholder="morning_dose.mp3"
        autoComplete="off"
      />

      <Divider />
      <Text variant="titleMedium">{t('shifts')}</Text>
      {value.schedules.map((s, i) => (
        <ShiftRow key={s.shift} idx={i} value={s} onChange={(p) => setShift(i, p)} />
      ))}
    </View>
  );
}

function ShiftRow({
  idx,
  value,
  onChange,
}: {
  idx: number;
  value: MedicineShiftValue;
  onChange: (patch: Partial<MedicineShiftValue>) => void;
}) {
  const [picking, setPicking] = useState(false);
  const label =
    value.shift === 'morning' ? t('shift_morning')
    : value.shift === 'afternoon' ? t('shift_afternoon')
    : t('shift_night');
  const icon: keyof typeof MaterialCommunityIcons.glyphMap =
    value.shift === 'morning' ? 'weather-sunny'
    : value.shift === 'afternoon' ? 'weather-partly-cloudy'
    : 'weather-night';

  const timeAsDate = () => {
    const [h, m] = value.time_hhmm.split(':').map((x) => parseInt(x, 10));
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  };

  return (
    <View style={[styles.shift, value.enabled && styles.shiftActive]}>
      <View style={styles.shiftHeader}>
        <View style={[styles.shiftIcon, value.enabled ? styles.shiftIconActive : null]}>
          <MaterialCommunityIcons name={icon} size={18} color={value.enabled ? palette.brand : palette.inkSoft} />
        </View>
        <Text style={styles.shiftLabel}>{label}</Text>
        <Switch value={value.enabled} onValueChange={(v) => onChange({ enabled: v })} color={palette.brand} />
      </View>
      <View style={styles.row}>
        {Platform.OS === 'web' ? (
          <WebDateTimeInput
            label="Time"
            type="time"
            value={/^\d{2}:\d{2}$/.test(value.time_hhmm) ? value.time_hhmm : '08:00'}
            onChange={(v) => onChange({ time_hhmm: v })}
          />
        ) : (
          <Pressable onPress={() => setPicking(true)} style={styles.half}>
            <TextInput
              mode="outlined"
              label="HH:MM"
              value={value.time_hhmm}
              editable={false}
              right={<TextInput.Icon icon="clock-outline" onPress={() => setPicking(true)} />}
            />
          </Pressable>
        )}
        <NumberInput
          label={t('dose_qty')}
          value={value.dose_qty}
          onChange={(n) => onChange({ dose_qty: Math.max(1, n) })}
          style={styles.half}
        />
      </View>
      {picking && Platform.OS !== 'web' && (
        <DateTimePicker
          mode="time"
          value={timeAsDate()}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setPicking(false);
            if (d) {
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              onChange({ time_hhmm: `${hh}:${mm}` });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  shift: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  shiftActive: { borderColor: palette.brand, backgroundColor: palette.brandTint },
  shiftHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shiftIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  shiftIconActive: { backgroundColor: palette.brandSoft },
  shiftLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: palette.ink },
});

/**
 * Numeric-only text input that works correctly on web (strips non-digits at
 * keystroke) and mobile (uses number-pad keyboard). Keeps local string state so
 * the field can be temporarily empty while editing.
 */
function NumberInput({
  label,
  value,
  onChange,
  style,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  style?: any;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when the parent's value changes externally (e.g. reset).
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (text === '') { setText(String(value)); }
      }}
      onChangeText={(v) => {
        const cleaned = v.replace(/[^0-9]/g, '');
        setText(cleaned);
        onChange(cleaned === '' ? 0 : parseInt(cleaned, 10));
      }}
      keyboardType="number-pad"
      inputMode="numeric"
      autoComplete="off"
      style={style}
    />
  );
}
