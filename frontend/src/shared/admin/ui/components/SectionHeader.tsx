import { cx, adminTokens } from '../tokens'

export function SectionHeader({
  title,
  description,
  right,
  className,
}: {
  title: string
  description?: string
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col md:flex-row md:items-start md:justify-between gap-3', className)} dir="auto">
      <div className="min-w-0">
        <div className={cx(adminTokens.text.sectionTitle, adminTokens.color.text)}>{title}</div>
        {description ? <div className={cx('mt-1', adminTokens.text.body, adminTokens.color.muted)}>{description}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2 shrink-0 ms-auto md:ms-0">{right}</div> : null}
    </div>
  )
}

