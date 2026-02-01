import api from './api'

export type CopilotSeverity = 'low' | 'med' | 'high'

export type CopilotCard = {
  id: string
  title: string
  value?: string
  severity: CopilotSeverity
  evidence: string[]
  actions: string[]
}

export type CopilotAskResponse = {
  ok: true
  intent: string
  cards: CopilotCard[]
  suggestions?: string[]
}

export async function askCopilot(question: string): Promise<CopilotAskResponse> {
  const res = await api.post('/api/admin/copilot/ask', { question })
  return res.data
}

