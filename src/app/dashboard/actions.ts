'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createSubject(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('subjects')
    .insert([{ name, slug, user_id: user.id }])

  if (error) {
    console.error('Error creating subject:', error)
    return
  }

  revalidatePath('/dashboard')
}

export async function createNote(formData: FormData) {
  const supabase = await createClient()
  const subjectId = formData.get('subjectId') as string
  const title = formData.get('title') as string || 'Untitled Note'
  const section = formData.get('section') as string || ''

  const { error } = await supabase
    .from('notes')
    .insert([{ subject_id: subjectId, title, section, body_md: '' }])

  if (error) {
    console.error('Error creating note:', error)
    return
  }

  revalidatePath('/dashboard')
}

export async function deleteSubject(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('subjects').delete().eq('id', id)
  revalidatePath('/dashboard')
}

export async function deleteNote(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('notes').delete().eq('id', id)
  revalidatePath('/dashboard')
}
