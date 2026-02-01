import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#d1fae5', text: colors.success },
  warning: { bg: '#fef3c7', text: colors.warning },
  danger: { bg: '#fee2e2', text: colors.danger },
  info: { bg: '#dbeafe', text: colors.info },
  neutral: { bg: colors.borderLight, text: colors.textSecondary },
}

type Props = {
  children: ReactNode
  variant?: Variant
  style?: object
}

export function Badge({ children, variant = 'neutral', style }: Props) {
  const v = variantStyles[variant]
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.captionBold,
    fontSize: 13,
  },
})
