import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'

type Props = {
  children: ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  style?: object
}

export function ScreenContainer({ children, edges = ['top', 'left', 'right'], style }: Props) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
  },
})
