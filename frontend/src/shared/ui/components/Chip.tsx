import { chipClass, cx } from '../tokens'

export function Chip({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button type="button" className={cx(chipClass(active), className)} onClick={onClick}>
      {children}
    </button>
  )
}

