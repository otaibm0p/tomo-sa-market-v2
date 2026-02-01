import { Tabs } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'
import { t } from '@/lib/i18n'

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>{name}</Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...typography.title2, color: '#fff' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.captionBold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'TOMO Driver',
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: t('order'),
          tabBarLabel: t('order'),
          tabBarIcon: ({ focused }) => <TabIcon name="Order" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarLabel: t('profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, opacity: 0.7 },
  iconFocused: { opacity: 1 },
})
