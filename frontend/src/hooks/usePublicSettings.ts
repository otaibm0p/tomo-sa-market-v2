import { useState, useEffect, useCallback } from 'react'
import { getPublicSettings, type PublicSettings } from '../shared/settings/publicSettings'

export function usePublicSettings(): {
  settings: PublicSettings | null
  loading: boolean
  refetch: () => Promise<void>
} {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPublicSettings()
      setSettings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { settings, loading, refetch }
}
