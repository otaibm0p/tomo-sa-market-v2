import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ActiveOrdersScreen } from './tabs/ActiveOrdersScreen'
import { HistoryOrdersScreen } from './tabs/HistoryOrdersScreen'
import { SettingsScreen } from './SettingsScreen'

const Tab = createBottomTabNavigator()

export function DriverHomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Active" component={ActiveOrdersScreen} options={{ title: 'Active' }} />
      <Tab.Screen name="History" component={HistoryOrdersScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  )
}

