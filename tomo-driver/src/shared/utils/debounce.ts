export function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number) {
  let t: any
  const debounced = (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), waitMs)
  }
  ;(debounced as any).cancel = () => {
    if (t) clearTimeout(t)
  }
  return debounced as T & { cancel: () => void }
}

