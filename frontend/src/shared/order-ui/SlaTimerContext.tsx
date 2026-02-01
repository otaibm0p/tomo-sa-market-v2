import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/** Single global 1s ticker for SLA badges (no per-row intervals) */
const SlaTickerContext = createContext<number>(Date.now())

export function SlaTickerProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <SlaTickerContext.Provider value={tick}>
      {children}
    </SlaTickerContext.Provider>
  )
}

export function useSlaTicker(): number {
  return useContext(SlaTickerContext)
}
