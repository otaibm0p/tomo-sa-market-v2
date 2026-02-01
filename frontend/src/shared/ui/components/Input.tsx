import { cx, inputClass } from '../tokens'

export function Input({
  value,
  onChange,
  placeholder,
  invalid,
  className,
  type = 'text',
  inputMode,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  invalid?: boolean
  className?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      className={cx(inputClass({ invalid }), className)}
    />
  )
}

