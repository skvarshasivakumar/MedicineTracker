import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface Props { children: React.ReactNode }
interface State { error: Error | null; info: string | null }

/**
 * Global error boundary so a bad render doesn't hard-crash the APK.
 * The screen shown here is our only view into JS errors on release builds
 * when adb / logcat is not available.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ error, info: info.componentStack });
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;
    const { error, info } = this.state;
    return (
      <View style={styles.root}>
        <Text variant="titleLarge" style={styles.title}>Something crashed</Text>
        <Text style={styles.name}>{error.name}: {error.message}</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.mono}>{error.stack ?? '(no stack)'}</Text>
          {info ? <Text style={styles.mono}>{'\nComponent stack:'}{info}</Text> : null}
        </ScrollView>
        <Button mode="contained" onPress={this.reset} style={styles.btn}>Try again</Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#FFF7F2' },
  title: { color: '#B93E64', marginBottom: 8 },
  name: { fontWeight: '600', marginBottom: 12, color: '#3B0F22' },
  scroll: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12 },
  scrollContent: { paddingBottom: 20 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#3B0F22' },
  btn: { marginTop: 12 },
});
