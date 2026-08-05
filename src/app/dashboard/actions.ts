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

// Unlike createNote (a bare form action), this returns the new note's id so
// the caller can navigate straight into it - "Take notes" on a path's video
// step needs to land on that note immediately, not just revalidate the list.
export async function createNoteForVideo(subjectId: string, title: string, videoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .insert([{ subject_id: subjectId, title, section: '', body_md: '', video_id: videoId }])
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { id: data.id }
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

  // 1. Find if Subject already exists
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select()
    .eq('user_id', user.id)
    .eq('slug', pathData.slug)
    .maybeSingle()

  // 2. Check if this existing subject already has a path
  if (existingSubject) {
    const { data: existingPaths } = await supabase
      .from('paths')
      .select('id')
      .eq('subject_id', existingSubject.id)
      .limit(1)

    if (existingPaths && existingPaths.length > 0) {
      const cookieStore = await cookies()
      cookieStore.set('active_subject_id', existingSubject.id, { path: '/' })
      revalidatePath('/dashboard')
      return { alreadyExists: true, pathId: existingPaths[0].id }
    }
  }

  // 3. Global 3-Path Limit Check (Strictly enforced before creating any new path)
  const { count: globalPathCount } = await supabase
    .from('paths')
    .select('id', { count: 'exact', head: true })

  if ((globalPathCount ?? 0) >= 3) {
    revalidatePath('/dashboard')
    return { 
      limitReached: true, 
      error: 'Limit reached: You already have 3 active learning paths across your workspace. Please delete an existing path on your dashboard before saving a new one.' 
    }
  }

  // 4. Create or reuse Subject
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

  const cookieStore = await cookies()
  cookieStore.set('active_subject_id', subject.id, { path: '/' })

  // 3. Create the Path
  const { data: path, error: pathError } = await supabase
    .from('paths')
    .insert({
      subject_id: subject.id
    })
    .select()
    .single()
    
  if (pathError) throw pathError

  // 4. Create Resources and PathSteps
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
