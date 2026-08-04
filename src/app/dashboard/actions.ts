'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import type { GeneratedPath } from '@/app/study/[query]/actions'

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

export async function saveGeneratedPath(pathData: GeneratedPath) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // 1. Find or create the Subject. Subjects are unique per (user_id, slug),
  // so saving a second path for a subject you already have must reuse that
  // row instead of inserting a duplicate — insert would violate the unique
  // constraint and throw before the new path ever got created, silently
  // losing every path after the first one for a given subject.
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select()
    .eq('user_id', user.id)
    .eq('slug', pathData.slug)
    .maybeSingle()

  let subject = existingSubject
  if (!subject) {
    const { data: newSubject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: pathData.subjectName,
        slug: pathData.slug
      })
      .select()
      .single()

    if (subjectError) throw subjectError
    subject = newSubject
  }

  // 2. Create the Path
  const { data: path, error: pathError } = await supabase
    .from('paths')
    .insert({
      subject_id: subject.id
    })
    .select()
    .single()
    
  if (pathError) throw pathError

  // 3. Create Resources and PathSteps
  for (let i = 0; i < pathData.resources.length; i++) {
    const r = pathData.resources[i];
    
    // Create Resource
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({
        subject_id: subject.id,
        title: r.title,
        url: r.url,
        provider: r.provider,
        is_free: r.isFree,
        cost: r.cost || 'Free',
        format: r.format,
        description: r.description,
        rank: i + 1
      })
      .select()
      .single()
      
    if (resourceError) throw resourceError
    
    // Create PathStep
    const { error: stepError } = await supabase
      .from('path_steps')
      .insert({
        path_id: path.id,
        resource_id: resource.id,
        order: i + 1,
        status: 'unstarted'
      })
      
    if (stepError) throw stepError
  }

  // Auto-switch to this newly created subject
  const cookieStore = await cookies()
  cookieStore.set('active_subject_id', subject.id, { path: '/' })
}

export async function updatePathStepStatus(stepId: string, status: 'unstarted' | 'completed') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // We rely on RLS to ensure the user owns the step
  const { error } = await supabase
    .from('path_steps')
    .update({ status })
    .eq('id', stepId)

  if (error) {
    console.error('Error updating step status:', error)
    return
  }

  revalidatePath('/dashboard')
}

export async function deletePath(pathId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS handles auth
  const { error } = await supabase
    .from('paths')
    .delete()
    .eq('id', pathId)

  if (error) {
    console.error('Error deleting path:', error)
    return
  }

  revalidatePath('/dashboard')
}



export async function setActiveSubject(formData: FormData) {
  const id = formData.get('subject_id') as string;
  const cookieStore = await cookies();
  cookieStore.set('active_subject_id', id, { path: '/' });
  revalidatePath('/dashboard');
}
