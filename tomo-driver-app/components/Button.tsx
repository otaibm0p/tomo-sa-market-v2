import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '@/constants/colors'
import { typography } from '@/constants/typography'

type Props = {
  children: ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  disabled?: boolean
  loading?: boolean
  style?: object
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: Props) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.borderLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  text: {
    ...typography.bodyBold,
    fontSize: 17,
  },
  text_primary: { color: '#fff' },
  text_secondary: { color: colors.text },
  text_outline: { color: colors.primary },
  text_danger: { color: '#fff' },
})
