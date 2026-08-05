'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText } from '@/lib/ai'
import { parseBlanks } from '@/lib/parseBlanks'
import {
  YoutubeTranscript,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript'

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

async function syncCardsFromNote(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string, bodyMd: string, videoId: string | null) {
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
    // Since section 2 no longer requires answers to be user-written, a
    // Vocab/Def pair can arrive pre-filled by AI just as easily as a Quiz
    // block can — there's no way to tell provenance from the text alone for
    // either kind. Every new card starts 'imported' (diagnostic) and
    // graduates to 'authored' via the section 4 mechanic (two correct
    // answers, then the user re-explains it in their own words).
    const tier = 'imported'
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
          // The video back-pointer only makes sense alongside a captured
          // moment - a blank with no preceding **At:** marker gets neither.
          video_id: blank.videoT != null ? videoId : null,
          t: blank.videoT ?? null,
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

  const { data, error } = await supabase
    .from('notes')
    .update({ body_md, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('video_id')
    .single()

  if (error) {
    console.error('Error updating note:', error)
    return { error: error.message }
  }

  await syncCardsFromNote(supabase, id, body_md, data?.video_id ?? null)

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
  revalidatePath('/dashboard')
  return { success: true }
}

export async function generatePromptsFromFile(noteId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const provider = (formData.get('provider') as 'auto' | 'gemini' | 'openai' | 'local') || 'auto'

    if (!file && !text) {
      throw new Error('No file or text provided')
    }

    // Get subject_id from noteId
    const { data: noteData } = await supabase.from('notes').select('subject_id').eq('id', noteId).single()
    const subjectId = noteData?.subject_id

    const promptText = `
You are an expert tutor extracting key concepts from study material.
You must generate exactly 20 flashcards across 2 categories.
CRITICAL RULES:
1. DO NOT include introductory text, markdown wrappers, or explanations (other than the required Explain field). Only output the raw text in the exact formats below.
2. If the material is short, extract additional core concepts, definitions, and application scenarios from it so you still reach the full count below - do not stop early.

2. Generate exactly 10 Vocabulary flashcards, with the definition filled in:
**Vocab:** [Word or concept]
**Def:** [Definition]
**Explain:** [Quote the exact 1-2 sentences from the source material where this concept was found to provide context]

3. Generate exactly 10 Multiple Choice quiz questions (YOU MUST PROVIDE THE OPTIONS, separated by the | character. The FIRST option must be the correct answer):
**Quiz:** [Multiple choice question]
**A:** [Correct Answer] | [Wrong Answer 1] | [Wrong Answer 2] | [Wrong Answer 3]
**Explain:** [Quote the exact 1-2 sentences from the source material where this answer was found to provide context]
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

        if (provider === 'local') {
          generatedText = `## Imported Raw Text\n\n${pdfText}`
        } else {
          generatedText = await generateText({
            prompt: `Here is the extracted text from the document:\n\n${pdfText}\n\n${promptText}`,
            provider,
          })
        }
      } else {
        // For images, we can safely use inline base64 data as they are usually small
        if (provider === 'local') {
          throw new Error('Local parsing is not supported for images. Please use an AI provider.')
        }
        const base64Data = buffer.toString('base64')

        generatedText = await generateText({
          prompt: promptText,
          image: { data: base64Data, mimeType: file.type },
          provider,
        })
      }
    } else if (text) {
      sourceText = text
      if (provider === 'local') {
        generatedText = `## Imported Raw Text\n\n${text}`
      } else {
        generatedText = await generateText({
          prompt: `${promptText}\n\nSource Material:\n${text}`,
          provider,
        })
      }
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
    revalidatePath('/dashboard')
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

export async function fetchVideoTranscript(videoId: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return { success: true, data: transcript };
  } catch (error: unknown) {
    console.error('Failed to fetch transcript:', error);
    // YouTube fingerprints and rate-limits datacenter egress IPs (Netlify
    // Functions run on AWS) harder than residential ones, so this specific
    // error is common in production and rare locally. Surfacing which case
    // it is (instead of one generic string) saves a redeploy-and-guess loop
    // next time this fires.
    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return { success: false, error: 'YouTube is rate-limiting this server right now. Try again in a few minutes.' };
    }
    if (error instanceof YoutubeTranscriptDisabledError) {
      return { success: false, error: 'Captions are disabled on this video.' };
    }
    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      return { success: false, error: 'This video is unavailable.' };
    }
    return { success: false, error: 'Could not fetch transcript. The video may not have captions enabled.' };
  }
}

