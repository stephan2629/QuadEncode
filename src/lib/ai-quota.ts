import 'server-only'

import { createClient } from '@/utils/supabase/server'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export interface ConsumedAIQuota {
  remaining: number
  resetAt: string
}

// The database function both verifies that the caller owns the note and
// consumes the current subject's import quota while its row is locked. A
// browser can call a Server Action directly, so a disabled button is not the
// security boundary.
export async function consumeSubjectAIImportQuota(supabase: ServerSupabase, noteId: string): Promise<ConsumedAIQuota> {
  const { data, error } = await supabase.rpc('consume_subject_ai_import', { p_note_id: noteId })
  if (error) throw new Error(error.message)

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row.remaining !== 'number' || typeof row.reset_at !== 'string') {
    throw new Error('Could not reserve an AI generation.')
  }

  return { remaining: row.remaining, resetAt: row.reset_at }
}
