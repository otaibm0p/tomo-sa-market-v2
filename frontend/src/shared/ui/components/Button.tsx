import { buttonClass, type ButtonSize, type ButtonVariant, cx } from '../tokens'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full,
  disabled,
  className,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cx(buttonClass({ variant, size, full, disabled }), className)}>
      {children}
    </button>
  )
}

