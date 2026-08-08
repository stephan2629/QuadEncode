'use server'

import { createClient } from '@/utils/supabase/server'
import { updateNoteContent } from '@/app/notes/[id]/actions'

export async function startQuizSession(noteId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('consume_subject_quiz_session', { p_note_id: noteId })
  if (error) return { error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  return { success: true, remaining: row?.remaining ?? 0 }
}

export async function saveMissedQuestionsAction(noteId: string, currentContent: string, missedQuestions: Array<{prompt: string, correct: string, explanation?: string}>) {
  try {
    let toAppend = '\n\n## Missed Questions Review\n\n';
    for (const q of missedQuestions) {
      toAppend += `**Vocab:** ${q.prompt}\n**Def:** ${q.correct}\n\n`;
    }
    await updateNoteContent(noteId, currentContent + toAppend);
    return { success: true };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Error saving missed questions:", e);
    return { success: false, error: e.message };
  }
}
