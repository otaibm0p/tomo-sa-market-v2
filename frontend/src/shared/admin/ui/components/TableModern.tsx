import { cx, adminTokens } from '../tokens'

export function TableModern({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('overflow-x-auto rounded-xl border', adminTokens.borders.soft, 'bg-white', className)}>
      <table className="w-full min-w-[600px] text-right border-collapse">
        {children}
      </table>
    </div>
  )
}

export function TableModernHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead>
      <tr className={cx('admin-table-head-row border-b', adminTokens.borders.soft, 'bg-gray-50/80', className)}>
        {children}
      </tr>
    </thead>
  )
}

export function TableModernTh({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={cx('px-4 py-3 text-xs font-bold uppercase tracking-wide', adminTokens.color.muted, className)}>
      {children}
    </th>
  )
}

export function TableModernBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableModernRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <tr className={cx('border-b border-gray-100 hover:bg-gray-50/50 transition-colors', className)}>
      {children}
    </tr>
  )
}

export function TableModernTd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cx('px-4 py-3 text-sm', adminTokens.color.text, className)}>
      {children}
    </td>
  )
}
