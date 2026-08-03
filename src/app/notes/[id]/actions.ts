'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNote(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notes')
    .select('*, subjects(name)')
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

  // We do not revalidate path aggressively here to prevent 
  // interrupting the user's typing experience in the client.
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
