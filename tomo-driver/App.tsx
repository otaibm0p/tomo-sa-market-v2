import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { View, Text } from 'react-native'
import { OrdersProvider } from './src/shared/orders/OrdersProvider'
import { DriverLoginScreen } from './src/screens/DriverLoginScreen'
import { DriverHomeTabs } from './src/screens/DriverHomeTabs'
import { OrderDetailsScreen } from './src/screens/OrderDetailsScreen'
import { AuthProvider, useAuth } from './src/shared/auth/AuthContext'
import { navigationRef } from './src/navigation/navigationRef'
import Toast from 'react-native-toast-message'

const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { ready, authed } = useAuth()
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <Stack.Navigator>
      {!authed ? (
        <Stack.Screen name="Login" component={DriverLoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={DriverHomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'تفاصيل الطلب' }} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <AuthProvider>
        <OrdersProvider>
          <RootNavigator />
        </OrdersProvider>
      </AuthProvider>
      <Toast />
    </NavigationContainer>
  )
}
