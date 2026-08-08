'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText, capSourceText } from '@/lib/ai'
import { consumeSubjectAIImportQuota } from '@/lib/ai-quota'
import { getImportInputError, MAX_IMPORT_TEXT_CHARS } from '@/lib/import-guard'
import { parseBlanks, haveBlanksChanged, uniqueStudyBlanks } from '@/lib/parseBlanks'

// Generous enough that no real note ever hits it (a note that size is
// already unusual), but it stops a runaway paste or a malformed client
// payload from writing an unbounded row. Rejected outright, never
// truncated - truncating typed content is silent data loss.
const MAX_BODY_MD_CHARS = 500_000

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

interface NewCardRow {
  note_id: string
  line: number
  tier: string
  type: string
  prompt: string
  answer: string
  explanation: string | null
  video_id: string | null
  t: number | null
  box: number
  due: string
}

// Postgres unique_violation. Only ever hit here on the (note_id, line)
// partial index added for basic/vocab cards (supabase/schema.sql) - the
// DB-level guarantee that a race between autosave and manual save (both
// deciding the same blank is new, both syncing concurrently) can't produce
// two cards for one line. See docs/decisions/0009.
const UNIQUE_VIOLATION = '23505'

async function syncCardsFromNote(supabase: Awaited<ReturnType<typeof createClient>>, noteId: string, bodyMd: string, videoId: string | null) {
  const parsed = uniqueStudyBlanks(parseBlanks(bodyMd).filter((b) => b.answer !== ''))
  const vocabReady = parsed.filter((b) => b.kind === 'vocab').length >= 10
  if (!vocabReady) {
    // The editor promises that study cards exist only after ten unique vocab
    // pairs. Remove generated cards if later edits drop below that minimum.
    await supabase.from('cards').delete().eq('note_id', noteId).in('type', ['basic', 'vocab'])
    return
  }
  const blanks = parsed.filter((b) => b.kind === 'vocab')

  const { data: existing } = await supabase
    .from('cards')
    .select('id, line, prompt, answer, explanation')
    .eq('note_id', noteId)
    .in('type', ['basic', 'vocab'])

  const existingByLine = new Map((existing ?? []).map((c) => [c.line, c]))
  const cardKey = (prompt: string, answer: string) => `${prompt.trim().toLocaleLowerCase()}\u0000${answer.trim().toLocaleLowerCase()}`
  const seenCards = new Set((existing ?? []).map((c) => cardKey(c.prompt, c.answer)))

  const toInsert: NewCardRow[] = []
  const toUpdate: { id: string; prompt: string; answer: string; explanation: string | null }[] = []

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
    const key = cardKey(blank.prompt, blank.answer)
    if (!current) {
      if (seenCards.has(key)) continue
      seenCards.add(key)
      toInsert.push({
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
      })
    } else if (current.prompt !== blank.prompt || current.answer !== blank.answer || current.explanation !== explanation) {
      toUpdate.push({ id: current.id, prompt: blank.prompt, answer: blank.answer, explanation })
    }
  }

  // One round trip each instead of one per card (up to 20 after a full AI
  // generation pass, previously sequential). The two arrays never target
  // the same row - toInsert is exactly the lines with no existing card,
  // toUpdate is exactly the lines that do - so running them concurrently is
  // safe. Update goes through upsert-by-id: sending only the changed
  // columns means Postgres's ON CONFLICT (id) DO UPDATE SET only touches
  // prompt/answer/explanation, leaving box/due/tier/etc alone.
  await Promise.all([
    insertCardsIgnoringConflicts(supabase, noteId, toInsert),
    toUpdate.length > 0
      ? supabase.from('cards').upsert(toUpdate, { onConflict: 'id' })
      : Promise.resolve(),
  ])
}

async function insertCardsIgnoringConflicts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  rows: NewCardRow[]
) {
  if (rows.length === 0) return
  const { error } = await supabase.from('cards').insert(rows)
  if (!error) return
  if (error.code !== UNIQUE_VIOLATION) {
    console.error('Error inserting cards:', error)
    return
  }
  // Lost the race on at least one row - a concurrent save (autosave vs.
  // manual, or two overlapping autosaves) already inserted a card at one
  // of these lines. Postgres rejects the whole batch as one statement, so
  // find out which lines actually still need a card and retry once with
  // just those. If that retry also conflicts, the note text itself already
  // saved regardless - log and move on rather than looping.
  const { data: nowExisting } = await supabase
    .from('cards')
    .select('line')
    .eq('note_id', noteId)
    .in('type', ['basic', 'vocab'])
    .in('line', rows.map((r) => r.line))
  const stillMissing = rows.filter((r) => !nowExisting?.some((e) => e.line === r.line))
  if (stillMissing.length === 0) return
  const { error: retryError } = await supabase.from('cards').insert(stillMissing)
  if (retryError) console.error('Error inserting cards on retry:', retryError)
}

const PDF_BUCKET = 'note-pdfs'

export async function getNote(id: string) {
  const supabase = await createClient()

  // Explicit columns, not '*': only what NoteEditor/page.tsx actually read
  // off the returned note (body_md, title, video_id, pdf_path for the
  // signed-URL check below, cards, subjects.name). No app-level ownership
  // check here or in any of this file's other reads/writes - row level
  // security (supabase/schema.sql, "own notes"/"own cards" policies) is
  // the entire access boundary, and every one of these queries goes through
  // it the same way, so an app-level check would just be a second copy of
  // the same rule, not real defense in depth. See docs/decisions/0009 and
  // the RLS test in src/lib/__tests__/notes-rls.test.ts.
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, body_md, video_id, pdf_path, subjects(name), cards(id, note_id, line, type, tier, prompt, answer, explanation, box, due, fails)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching note:', id, error.message, error.details, error.hint)
    }
    return null
  }

  // This project has no generated Supabase Database type (createClient()
  // isn't parameterized with one), so supabase-js can't tell notes->subjects
  // is many-to-one and infers `subjects` as an array either way. It's a
  // single embedded object at runtime (PostgREST's normal behavior for a
  // to-one FK, and the pre-existing shape NoteEditor.tsx already reads via
  // `initialData.subjects?.name`) - this cast fixes the type to match, not
  // the runtime behavior, which was already correct.
  type NoteRow = Omit<typeof data, 'subjects'> & { subjects: { name: string } | null }
  const note = data as unknown as NoteRow

  if (!note.pdf_path) return { ...note, pdfUrl: null }

  // Stored as a durable object path, not a URL, since signed URLs expire —
  // a fresh one is minted on every note load instead.
  const { data: signed } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(note.pdf_path, 3600)
  return { ...note, pdfUrl: signed?.signedUrl ?? null }
}

// prevBodyMd: what the caller last successfully saved, if it knows (the
// editor tracks this in a ref - see NoteEditor.tsx). When given and the
// note's blanks (Vocab/Def, Quiz/A pairs) haven't changed between the two,
// syncCardsFromNote is skipped entirely - prose-only edits, the overwhelming
// majority of autosaves, cost one lightweight UPDATE and zero card queries
// instead of a full reconciliation pass every keystroke. Omitted entirely
// (undefined) means "sync anyway" - the safe default for the one other
// caller, generateAIQuizAction (src/app/actions/quiz-actions.ts), which
// always appends genuinely new cards and has no "previous" to compare.
export async function updateNoteContent(id: string, body_md: string, prevBodyMd?: string) {
  if (body_md.length > MAX_BODY_MD_CHARS) {
    return { error: `Note is too long to save (${body_md.length.toLocaleString()} characters, limit ${MAX_BODY_MD_CHARS.toLocaleString()}). Trim it and try again.` }
  }

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

  if (prevBodyMd === undefined || haveBlanksChanged(prevBodyMd, body_md)) {
    await syncCardsFromNote(supabase, id, body_md, data?.video_id ?? null)
  }

  // This used to be skipped ("to prevent interrupting the user's typing"),
  // which left the client Router Cache holding whatever the note looked
  // like when the page first loaded. Editing a note, navigating to the
  // dashboard, and coming back showed the pre-edit text, as if the work had
  // been lost - reproduced on a production build, not just in dev. The text
  // was always safe in Postgres; only the cached RSC payload was stale.
  //
  // Safe to do on every save: autosave is debounced, so it fires once after
  // the user stops typing rather than per keystroke, and the re-render this
  // triggers doesn't reset the editor - `content` lives in useState, which
  // survives a server re-render of the same mounted component (only
  // `initialData` changes, and that's read once on mount).
  revalidatePath(`/notes/${id}`)

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

    const fileEntry = formData.get('file')
    const textEntry = formData.get('text')
    const file = fileEntry instanceof File ? fileEntry : null
    const text = typeof textEntry === 'string' ? textEntry : null
    const provider = (formData.get('provider') as 'auto' | 'gemini' | 'openai' | 'local') || 'auto'

    if (!['auto', 'gemini', 'openai', 'local'].includes(provider)) throw new Error('Unsupported AI provider')
    if ((fileEntry && !file) || (textEntry && text === null)) throw new Error('Invalid import data')
    const inputError = getImportInputError({
      file: file ? { size: file.size, type: file.type } : undefined,
      text: text || undefined,
    })
    if (inputError) throw new Error(inputError)

    // Verify ownership before parsing, uploading, or calling a provider. RLS
    // keeps a forged id indistinguishable from a missing note.
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('id, subject_id')
      .eq('id', noteId)
      .single()
    if (noteError || !noteData) throw new Error('Note not found')
    const subjectId = noteData.subject_id

    // Local imports simply add the supplied source text. Every import that
    // invokes an AI provider reserves one of this subject's three rolling
    // 24-hour scans before the provider receives the content.
    const importQuota = provider === 'local'
      ? null
      : await consumeSubjectAIImportQuota(supabase, noteId)

    const promptText = `
You are an expert tutor extracting key concepts from study material.
Generate up to 10 vocabulary cards and up to 10 quiz questions from the source.
CRITICAL RULES:
1. DO NOT include introductory text, markdown wrappers, or explanations (other than the required Explain field). Only output the raw text in the exact formats below.
2. Only create cards and questions supported by the source material. Never invent concepts, answers, or explanations. If the source cannot support ten items in a category, return fewer items.

2. Generate up to 10 Vocabulary flashcards, with the definition filled in:
**Vocab:** [Word or concept]
**Def:** [Definition]
**Explain:** [Quote the exact 1-2 sentences from the source material where this concept was found to provide context]

3. Generate up to 10 Multiple Choice quiz questions (YOU MUST PROVIDE THE OPTIONS, separated by the | character. The FIRST option must be the correct answer):
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
        if (pdfText.length > MAX_IMPORT_TEXT_CHARS) {
          throw new Error(`Extracted text is too long. Keep documents under ${MAX_IMPORT_TEXT_CHARS.toLocaleString()} characters.`)
        }
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
            prompt: `Here is the extracted text from the document:\n\n${capSourceText(pdfText)}\n\n${promptText}`,
            provider,
          })
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth')
        const extracted = await mammoth.extractRawText({ buffer })
        sourceText = extracted.value
        if (sourceText.length > MAX_IMPORT_TEXT_CHARS) {
          throw new Error(`Extracted text is too long. Keep documents under ${MAX_IMPORT_TEXT_CHARS.toLocaleString()} characters.`)
        }
        generatedText = provider === 'local'
          ? `## Imported Raw Text\n\n${sourceText}`
          : await generateText({ prompt: `Here is the extracted text from the document:\n\n${capSourceText(sourceText)}\n\n${promptText}`, provider })
      } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
        sourceText = buffer.toString('utf8')
        if (sourceText.length > MAX_IMPORT_TEXT_CHARS) {
          throw new Error(`Imported text is too long. Keep documents under ${MAX_IMPORT_TEXT_CHARS.toLocaleString()} characters.`)
        }
        generatedText = provider === 'local'
          ? `## Imported Raw Text\n\n${sourceText}`
          : await generateText({ prompt: `${promptText}\n\nSource Material:\n${capSourceText(sourceText)}`, provider })
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
          prompt: `${promptText}\n\nSource Material:\n${capSourceText(text)}`,
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
          kind: file ? (file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'text') : 'text',
          raw_ref: file ? file.name : 'pasted_text',
          status: 'completed'
        })
        
      if (importError) {
        console.error('Error recording import:', importError)
      }
    }

    revalidatePath(`/notes/${noteId}`)
    revalidatePath('/dashboard')
    return {
      success: true,
      text: finalPrompts,
      sourceText,
      pdfUrl,
      remainingImports: importQuota?.remaining ?? null,
    }
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
