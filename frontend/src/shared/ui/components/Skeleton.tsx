import { cx, radius } from '../tokens'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse bg-gray-200/80', radius.card, className)} />
}

