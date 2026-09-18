import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, shadow, spacing } from '@/theme';
import { t } from '@/i18n';

export type ConfirmVariant = 'default' | 'destructive' | 'info' | 'success' | 'warning';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttonLabel?: string;
  variant?: Exclude<ConfirmVariant, 'destructive'>;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

interface DialogState {
  kind: 'confirm' | 'alert';
  opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    buttonLabel?: string;
    variant?: ConfirmVariant;
    icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  };
  resolve: (v: any) => void;
}

const VARIANT_STYLES: Record<ConfirmVariant, { bg: string; ring: string; ink: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  default:     { bg: palette.brandSoft, ring: palette.brand, ink: palette.brandDark, icon: 'help-circle-outline' },
  destructive: { bg: palette.roseSoft,  ring: palette.rose,  ink: '#7F1D1D',         icon: 'trash-can-outline' },
  info:        { bg: palette.brandSoft, ring: palette.brand, ink: palette.brandDark, icon: 'information-outline' },
  success:     { bg: palette.mintSoft,  ring: palette.mint,  ink: '#14532D',         icon: 'check-circle-outline' },
  warning:     { bg: palette.amberSoft, ring: palette.amber, ink: '#78350F',         icon: 'alert-circle-outline' },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const stateRef = useRef<DialogState | null>(null);
  stateRef.current = state;

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: 'confirm', opts: { ...opts }, resolve });
    });
  }, []);

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setState({ kind: 'alert', opts: { ...opts }, resolve });
    });
  }, []);

  const close = useCallback((value: any) => {
    const s = stateRef.current;
    if (!s) return;
    setState(null);
    s.resolve(value);
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const s = state?.opts;
  const variant = (s?.variant ?? (state?.kind === 'confirm' ? 'default' : 'info')) as ConfirmVariant;
  const vs = VARIANT_STYLES[variant];
  const iconName = s?.icon ?? vs.icon;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Portal>
        <Modal
          visible={state !== null}
          onDismiss={() => close(state?.kind === 'confirm' ? false : undefined)}
          contentContainerStyle={styles.modal}
          style={styles.wrapper}
        >
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: vs.bg, borderColor: vs.ring }]}>
              <MaterialCommunityIcons name={iconName} size={34} color={vs.ring} />
            </View>
            <Text variant="titleLarge" style={[styles.title, { color: vs.ink }]}>{s?.title ?? ''}</Text>
            {!!s?.message && (
              <Text variant="bodyMedium" style={styles.message}>{s.message}</Text>
            )}
            {state?.kind === 'confirm' ? (
              <View style={styles.row}>
                <Pressable
                  onPress={() => close(false)}
                  style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                  android_ripple={{ color: palette.outlineSoft }}
                >
                  <Text style={styles.btnGhostText}>{s?.cancelLabel ?? t('cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => close(true)}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    { backgroundColor: vs.ring },
                    pressed && styles.pressed,
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  <Text style={styles.btnPrimaryText}>
                    {s?.confirmLabel ?? (variant === 'destructive' ? t('delete') : t('ok'))}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.rowSingle}>
                <Pressable
                  onPress={() => close(undefined)}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    styles.btnPrimaryWide,
                    { backgroundColor: vs.ring },
                    pressed && styles.pressed,
                  ]}
                  android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  <Text style={styles.btnPrimaryText}>{s?.buttonLabel ?? t('ok')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Modal>
      </Portal>
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    padding: 0,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadow.lg,
    borderWidth: 1,
    borderColor: palette.outlineSoft,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    color: palette.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  rowSingle: {
    width: '100%',
    marginTop: spacing.xs,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceAlt,
  },
  btnGhostText: {
    color: palette.ink,
    fontWeight: '600',
    fontSize: 15,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  btnPrimaryWide: {
    width: '100%',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
