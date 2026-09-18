import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { palette, radius, spacing } from '@/theme';

interface Props {
  label: string;
  /** Either 'date' | 'time' | 'datetime-local'. */
  type: 'date' | 'time' | 'datetime-local';
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}

/**
 * Web-only wrapper around a native browser <input type="date|time"> so users
 * get the real OS picker (calendar / clock) instead of a plain text field.
 * On native platforms this component returns null; callers should render their
 * own <DateTimePicker>-based UI in that case.
 */
export function WebDateTimeInput({ label, type, value, onChange, min, max }: Props) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {React.createElement('input', {
        type,
        value,
        min,
        max,
        onChange: (e: any) => onChange(e.target.value),
        style: {
          width: '100%',
          height: 48,
          padding: '0 12px',
          border: `1px solid ${palette.outline}`,
          borderRadius: 12,
          backgroundColor: palette.surface,
          fontSize: 15,
          color: palette.ink,
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.xs },
  label: {
    fontSize: 12,
    color: palette.inkMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
});
