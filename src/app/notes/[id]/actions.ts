'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseBlanks } from '@/lib/parseBlanks'

async function syncCardsFromNote(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string, bodyMd: string) {
  const blanks = parseBlanks(bodyMd).filter((b) => b.answer !== '')
  if (blanks.length === 0) return

  const { data: existing } = await supabase
    .from('cards')
    .select('id, line, prompt, answer')
    .eq('note_id', noteId)
    .eq('type', 'basic')

  const existingByLine = new Map((existing ?? []).map((c) => [c.line, c]))

  for (const blank of blanks) {
    const current = existingByLine.get(blank.line)
    if (!current) {
      await supabase.from('cards').insert([
        {
          note_id: noteId,
          line: blank.line,
          tier: 'authored',
          type: 'basic',
          prompt: blank.prompt,
          answer: blank.answer,
          box: 0,
          due: new Date().toISOString(),
        },
      ])
    } else if (current.prompt !== blank.prompt || current.answer !== blank.answer) {
      await supabase
        .from('cards')
        .update({ prompt: blank.prompt, answer: blank.answer })
        .eq('id', current.id)
    }
  }
}

export async function getNote(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notes')
    .select('*, subjects(name), cards(id, line, type, prompt, answer)')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('Error fetching note:', error)
    return null
  }
  
  return data
}

export async function updateNoteContent(id: string, body_md: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ body_md, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating note:', error)
    return { error: error.message }
  }

  await syncCardsFromNote(supabase, id, body_md)

  // We do not revalidate path aggressively here to prevent
  // interrupting the user's typing experience in the client.
  return { success: true }
}

export async function createClozeCard(noteId: string, line: number, prompt: string, answer: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('cards').insert([
    {
      note_id: noteId,
      line,
      tier: 'authored',
      type: 'cloze',
      prompt,
      answer,
      box: 0,
      due: new Date().toISOString(),
    },
  ])

  if (error) {
    console.error('Error creating cloze card:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateNoteTitle(id: string, title: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .update({ title })
    .eq('id', id)

  if (error) {
    console.error('Error updating title:', error)
    return { error: error.message }
  }

  revalidatePath(`/notes/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}
