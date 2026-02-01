import { cardClass, cx } from '../tokens'

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cx(cardClass(), className)}>{children}</div>
}

