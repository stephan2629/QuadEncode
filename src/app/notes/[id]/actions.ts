'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText } from '@/lib/ai'
import { parseBlanks } from '@/lib/parseBlanks'

function friendlyAIError(e: Error): string {
  const msg = e.message || 'Something went wrong generating that.'
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return "You've hit the AI free tier rate limit. Please wait about 10 seconds and try again."
  }
  if (msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('high demand')) {
    return 'The AI model is overloaded right now. Please try again in a moment.'
  }
  if (msg.includes('All AI providers failed')) {
    return 'The AI generator is temporarily unavailable across every provider. Please try again shortly.'
  }
  return msg
}

async function syncCardsFromNote(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string, bodyMd: string) {
  const blanks = parseBlanks(bodyMd).filter((b) => b.answer !== '')
  if (blanks.length === 0) return

  const { data: existing } = await supabase
    .from('cards')
    .select('id, line, prompt, answer, explanation')
    .eq('note_id', noteId)
    .in('type', ['basic', 'vocab'])

  const existingByLine = new Map((existing ?? []).map((c) => [c.line, c]))

  for (const blank of blanks) {
    const current = existingByLine.get(blank.line)
    const explanation = blank.explanation ?? null
    // Vocab/Def blanks render as the front/back flip card (section 6); quiz
    // stays 'basic' since its multiple-choice-ness is already detected from
    // the pipe-separated answer, not the type column.
    const type = blank.kind === 'vocab' ? 'vocab' : 'basic'
    // A vocab card's answer can't exist until the user personally types the
    // definition into the blank (section 9), so it's authored by definition.
    // A quiz block's options are always written in full at the time the
    // `**Quiz:**/**A:**` text is created — by an AI import or by the user
    // typing distractors themselves — so per section 4's two-tier model it's
    // diagnostic, not mastery, until it graduates.
    const tier = blank.kind === 'vocab' ? 'authored' : 'imported'
    if (!current) {
      await supabase.from('cards').insert([
        {
          note_id: noteId,
          line: blank.line,
          tier,
          type,
          prompt: blank.prompt,
          answer: blank.answer,
          explanation,
          box: 0,
          due: new Date().toISOString(),
        },
      ])
    } else if (current.prompt !== blank.prompt || current.answer !== blank.answer || current.explanation !== explanation) {
      await supabase
        .from('cards')
        .update({ prompt: blank.prompt, answer: blank.answer, explanation })
        .eq('id', current.id)
    }
  }
}

const PDF_BUCKET = 'note-pdfs'

export async function getNote(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .select('*, subjects(name), cards(id, note_id, line, type, tier, prompt, answer, explanation, box, due, fails)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching note:', id, error.message, error.details, error.hint)
    }
    return null
  }

  if (!data.pdf_path) return { ...data, pdfUrl: null }

  // Stored as a durable object path, not a URL, since signed URLs expire —
  // a fresh one is minted on every note load instead.
  const { data: signed } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(data.pdf_path, 3600)
  return { ...data, pdfUrl: signed?.signedUrl ?? null }
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
    const provider = (formData.get('provider') as 'auto' | 'gemini' | 'openai') || 'auto'

    if (!file && !text) {
      throw new Error('No file or text provided')
    }

    // Get subject_id from noteId
    const { data: noteData } = await supabase.from('notes').select('subject_id').eq('id', noteId).single()
    const subjectId = noteData?.subject_id

    const promptText = `
You are an expert tutor extracting key concepts from study material.
You must generate exactly 12 flashcards across 2 categories.
CRITICAL RULES:
1. DO NOT include introductory text, markdown wrappers, or explanations. Only output the raw text in the exact formats below.

2. Generate exactly 6 Vocabulary flashcards (leave the definition blank so the student can fill it in):
**Vocab:** [Word or concept]
**Def:**

3. Generate exactly 6 Multiple Choice quiz questions (YOU MUST PROVIDE THE OPTIONS, separated by the | character. The FIRST option must be the correct answer):
**Quiz:** [Multiple choice question]
**A:** [Correct Answer] | [Wrong Answer 1] | [Wrong Answer 2] | [Wrong Answer 3]
`

    let generatedText = ''
    let sourceText: string | null = null
    let pdfUrl: string | null = null

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())

      if (file.type === 'application/pdf') {
        // Extract text from PDF locally to bypass file-size limits and File API
        // quirks on some providers. Dynamically imported so it doesn't pull
        // pdfjs-dist into every route on Netlify.
        type PdfParser = { getText: () => Promise<{ text: string }> }
        type PdfParseModule = {
          PDFParse?: new (opts: { data: Uint8Array }) => PdfParser
          default?: new (opts: { data: Uint8Array }) => PdfParser
        }
        const pdfParseModule = (await import('pdf-parse')) as unknown as PdfParseModule
        const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default
        if (!PDFParse) throw new Error('PDF parser failed to load')
        const parser = new PDFParse({ data: new Uint8Array(buffer) })
        const parsed = await parser.getText()
        const pdfText = parsed.text
        sourceText = pdfText

        // Keep the original file too, not just its extracted text, so the
        // note can show the source exactly as it looked (section 2's "never
        // pre-populate an answer" is about generated prompts, not about the
        // source material itself, which is already shown as source_excerpt
        // elsewhere in the app).
        const pdfPath = `${user.id}/${noteId}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from(PDF_BUCKET)
          .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: true })

        if (uploadError) {
          console.error('Error uploading source PDF:', uploadError.message)
        } else {
          await supabase.from('notes').update({ pdf_path: pdfPath }).eq('id', noteId)
          const { data: signed } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(pdfPath, 3600)
          pdfUrl = signed?.signedUrl ?? null
        }

        generatedText = await generateText({
          prompt: `Here is the extracted text from the document:\n\n${pdfText}\n\n${promptText}`,
          provider,
        })
      } else {
        // For images, we can safely use inline base64 data as they are usually small
        const base64Data = buffer.toString('base64')

        generatedText = await generateText({
          prompt: promptText,
          image: { data: base64Data, mimeType: file.type },
          provider,
        })
      }
    } else if (text) {
      generatedText = await generateText({
        prompt: `${promptText}\n\nSource Material:\n${text}`,
        provider,
      })
      sourceText = text
    }

    // Clean up the response to ensure it strictly follows the format.
    // Ensure there is a blank line between each flashcard.
    let cleaned = generatedText.replace(/```markdown/g, '').replace(/```/g, '').trim();
    
    // Add newlines before every card if they are missing
    cleaned = cleaned.replace(/\*\*(Vocab|Quiz):\*\*/g, '\n\n**$1:**').trim();

    if (!cleaned) {
      throw new Error('Failed to generate valid prompts.')
    }
    
    const finalPrompts = cleaned;

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

    revalidatePath(`/notes/${noteId}`)
    return { success: true, text: finalPrompts, sourceText, pdfUrl }
  } catch (err: unknown) {
    const e = err as Error;
    console.error('Error generating prompts:', e)

    return { success: false, error: friendlyAIError(e) }
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

