import { View, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { palette } from '@/theme';

interface Props {
  children: ReactNode;
  /** Set to false when the screen renders its own solid background. */
  tinted?: boolean;
}

/** App-wide screen container so every route shares the same background canvas. */
export function Screen({ children, tinted = true }: Props) {
  return (
    <View style={[styles.root, tinted ? styles.tint : null]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  tint: { backgroundColor: palette.background },
});
