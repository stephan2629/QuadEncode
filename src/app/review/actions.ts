'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { nextBox, nextDue } from '@/lib/scheduler'

// **Q:**/**A:** is retired (section 6), so a third failure now spawns a
// Vocab/Def blank instead: term is the concept that keeps failing, and the
// blank definition is where the user re-explains it in their own words.
async function appendExplainDifferently(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string, prompt: string) {
  const { data: note } = await supabase.from('notes').select('body_md').eq('id', noteId).single()
  if (!note) return

  const heading = '## Open questions'
  const addition = `**Vocab:** ${prompt}\n**Def:** `
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
    .select('box, fails, note_id, prompt, tier')
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
    await appendExplainDifferently(supabase, card.note_id, card.prompt)
  }

  // Section 4: an imported/diagnostic card graduates to authored after two
  // correct answers in a row, followed by the user re-explaining it in their
  // own words. "Last two reviews were both correct" is read straight from
  // the reviews history rather than a dedicated streak column - it's the
  // same fact, self-resets on a wrong answer, and needs no migration.
  let readyToGraduate = false
  if (correct && card.tier === 'imported') {
    const { data: recent } = await supabase
      .from('reviews')
      .select('rated')
      .eq('card_id', cardId)
      .order('reviewed_at', { ascending: false })
      .limit(2)
    readyToGraduate = recent?.length === 2 && recent.every((r) => r.rated === 'correct')
  }

  revalidatePath('/review')
  revalidatePath('/dashboard')

  return { success: true, readyToGraduate }
}

// The user's own re-explanation replaces the diagnostic answer outright -
// once it's in their words the card is mastery, not recognition, per
// section 4. For a quiz card this also has the side effect of dropping the
// pipe-separated options, so it naturally stops rendering as multiple choice
// and becomes a normal recall prompt going forward.
export async function graduateCard(cardId: string, reExplanation: string) {
  const supabase = await createClient()
  const trimmed = reExplanation.trim()
  if (!trimmed) return { error: 'Write an explanation before continuing.' }

  const { error } = await supabase
    .from('cards')
    .update({ tier: 'authored', answer: trimmed })
    .eq('id', cardId)

  if (error) return { error: error.message }

  revalidatePath('/review')
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
