import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { formatTimeAgo } from '../order-ui/orderUiUtils'
import { MessageSquare, Send } from 'lucide-react'

export type EntityType = 'order' | 'rider'

export interface InternalNote {
  id: number
  entity_type: string
  entity_id: number
  note: string
  created_at: string
  author_name?: string | null
}

interface InternalNotesPanelProps {
  entityType: EntityType
  entityId: number | null
  canAdd?: boolean
  lang?: 'ar' | 'en'
  emptyLabel?: string
  placeholder?: string
  addLabel?: string
}

export function InternalNotesPanel({
  entityType,
  entityId,
  canAdd = true,
  lang = 'en',
  emptyLabel,
  placeholder,
  addLabel,
}: InternalNotesPanelProps) {
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newNote, setNewNote] = useState('')

  const emptyText = emptyLabel ?? (lang === 'ar' ? 'لا توجد ملاحظات.' : 'No notes yet.')
  const placehold = placeholder ?? (lang === 'ar' ? 'أضف ملاحظة داخلية...' : 'Add internal note...')
  const addText = addLabel ?? (lang === 'ar' ? 'إضافة' : 'Add')

  useEffect(() => {
    if (!entityId) {
      setNotes([])
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get('/api/admin/internal-notes', { params: { entityType, entityId } })
      .then((res) => {
        if (!cancelled) setNotes(res.data?.notes ?? [])
      })
      .catch(() => {
        if (!cancelled) setNotes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [entityType, entityId])

  const handleAdd = async () => {
    const text = newNote.trim()
    if (!entityId || !text || adding) return
    setAdding(true)
    try {
      const res = await api.post('/api/admin/internal-notes', { entityType, entityId, note: text })
      setNotes((prev) => [...prev, { ...res.data?.note, author_name: null }])
      setNewNote('')
    } catch {
      // keep form state
    } finally {
      setAdding(false)
    }
  }

  if (entityId == null) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
        <MessageSquare className="w-4 h-4" />
        {lang === 'ar' ? 'ملاحظات داخلية' : 'Internal notes'}
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {notes.length === 0 ? (
            <li className="text-sm text-gray-500">{emptyText}</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="text-sm p-2 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-gray-800">{n.note}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {n.author_name ? `${n.author_name} · ` : ''}
                  {formatTimeAgo(n.created_at, lang)}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
      {canAdd && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={placehold}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
          <button
            type="button"
            disabled={!newNote.trim() || adding}
            onClick={handleAdd}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {addText}
          </button>
        </div>
      )}
    </div>
  )
}
