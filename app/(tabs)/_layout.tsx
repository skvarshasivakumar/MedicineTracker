import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, shadow, spacing } from '@/theme';
import { t } from '@/i18n';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.inkSoft,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home-heart' : 'home-outline'}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: t('tab_medicines'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'pill' : 'pill'} color={color} size={focused ? 26 : 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: t('tab_stock'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'package-variant-closed' : 'package-variant'}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t('tab_appointments'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'stethoscope' : 'stethoscope'}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cog' : 'cog-outline'}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === 'ios' ? 20 : 14,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    borderTopWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: 8,
    paddingBottom: 8,
    ...shadow.lg,
  },
  item: { borderRadius: radius.lg, marginHorizontal: 2 },
  label: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
