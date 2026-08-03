'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { nextBox, nextDue } from '@/lib/scheduler'

async function appendExplainDifferently(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string) {
  const { data: note } = await supabase.from('notes').select('body_md').eq('id', noteId).single()
  if (!note) return

  const heading = '## Open questions'
  const addition = '?? Explain this a different way.\n>> '
  const trimmed = note.body_md.replace(/\s*$/, '')

  const body = trimmed.includes(heading)
    ? `${trimmed}\n${addition}\n`
    : `${trimmed}\n\n${heading}\n\n${addition}\n`

  await supabase.from('notes').update({ body_md: body, updated_at: new Date().toISOString() }).eq('id', noteId)
}

export async function submitReview(cardId: string, correct: boolean) {
  const supabase = await createClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('box, fails, note_id')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) {
    return { error: 'Card not found' }
  }

  const box = nextBox(card.box, correct)
  const due = nextDue(box)
  const fails = correct ? card.fails : card.fails + 1

  const { error: updateError } = await supabase
    .from('cards')
    .update({ box, due: due.toISOString(), fails })
    .eq('id', cardId)

  if (updateError) {
    return { error: updateError.message }
  }

  await supabase.from('reviews').insert([{ card_id: cardId, rated: correct ? 'correct' : 'wrong' }])

  if (!correct && fails === 3) {
    await appendExplainDifferently(supabase, card.note_id)
  }

  revalidatePath('/review')
  revalidatePath('/dashboard')

  return { success: true }
}

// Box 0's first review is quality control, not a graded attempt. Keep is the
// QC pass and promotes the card straight into normal rotation.
export async function keepCard(cardId: string) {
  const supabase = await createClient()
  const due = nextDue(1)

  const { error } = await supabase.from('cards').update({ box: 1, due: due.toISOString() }).eq('id', cardId)
  if (error) return { error: error.message }

  revalidatePath('/review')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCard(cardId: string, prompt: string, answer: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('cards').update({ prompt, answer }).eq('id', cardId)
  if (error) return { error: error.message }

  revalidatePath('/review')
  return { success: true }
}

export async function deleteCard(cardId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) return { error: error.message }

  revalidatePath('/review')
  revalidatePath('/dashboard')
  return { success: true }
}
