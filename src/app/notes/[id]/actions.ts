'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenAI } from '@google/genai'
import { PDFParse } from 'pdf-parse'
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

  const { error } = await supabase
    .from('cards')
    .insert({
      note_id: noteId,
      line,
      type: 'cloze',
      tier: 'authored',
      prompt,
      answer
    })

  if (error) {
    console.error('Error creating cloze card:', error)
    return { error: 'Failed to create card' }
  }

  revalidatePath(`/notes/${noteId}`)
  return { success: true }
}

export async function generatePromptsFromFile(noteId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    if (!file && !text) {
      throw new Error('No file or text provided')
    }

    // Get subject_id from noteId
    const { data: noteData } = await supabase.from('notes').select('subject_id').eq('id', noteId).single()
    const subjectId = noteData?.subject_id

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const promptText = `
You are an expert tutor. Your goal is to extract key concepts, terms, and facts from the provided material and convert them into diagnostic study questions.
CRITICAL RULES:
1. Output ONLY the prompts/questions. NEVER output answers.
2. Format each prompt exactly like this: ?? [Question or Concept]
3. Maximum 12 prompts.
4. Do not include any other text, introductory remarks, or formatting. Just the lines starting with ??.
`

    let generatedText = ''

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())

      if (file.type === 'application/pdf') {
        // Extract text from PDF locally to bypass Gemini's 1000-page limit and File API quirks
        const parser = new PDFParse({ data: new Uint8Array(buffer) })
        const parsed = await parser.getText()
        const pdfText = parsed.text

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: `Here is the extracted text from the document:\n\n${pdfText}` },
                { text: promptText }
              ]
            }
          ]
        })
        generatedText = response.text || ''
      } else {
        // For images, we can safely use inlineData as they are usually small
        const base64Data = buffer.toString('base64')
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: file.type
                  }
                },
                { text: promptText }
              ]
            }
          ]
        })
        generatedText = response.text || ''
      }
    } else if (text) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `${promptText}\n\nSource Material:\n${text}`
      })
      generatedText = response.text || ''
    }

    // Clean up the response to ensure it strictly follows the format
    const lines = generatedText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('??'))
      .slice(0, 12)
      .join('\n')

    if (!lines) {
      throw new Error('Failed to generate valid prompts.')
    }

    // Record the import
    if (subjectId) {
      const { error: importError } = await supabase
        .from('imports')
        .insert({
          subject_id: subjectId,
          kind: file ? (file.type === 'application/pdf' ? 'pdf' : 'image') : 'text',
          raw_ref: file ? file.name : 'pasted_text',
          status: 'completed'
        })
        
      if (importError) {
        console.error('Error recording import:', importError)
      }
    }

    return { text: lines }
  } catch (error) {
    console.error('Error generating prompts:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate prompts'
    return { error: message }
  }
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
