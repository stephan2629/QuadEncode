'use server'

import { createClient } from '@/utils/supabase/server'
import { generateText, capSourceText } from '@/lib/ai'
import { getQuotaState, QUIZ_DAILY_LIMIT } from '@/lib/quota'
import { updateNoteContent } from '@/app/notes/[id]/actions'

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

async function loadQuotaProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, quiz_count_today, last_quiz_reset_at')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error loading quota profile:', error?.message)
    throw new Error(error?.message || 'Profile not found')
  }
  return profile
}

export interface QuizQuotaInfo {
  used: number
  remaining: number
  limit: number
  resetAt: string
  hoursUntilReset: number
}

export async function getQuizQuota(): Promise<QuizQuotaInfo> {
  try {
    const supabase = await createClient()
    const profile = await loadQuotaProfile(supabase)
    const state = getQuotaState({ count: profile.quiz_count_today, resetAt: new Date(profile.last_quiz_reset_at) })
    return { used: state.used, remaining: state.remaining, limit: state.limit, resetAt: state.resetAt.toISOString(), hoursUntilReset: state.hoursUntilReset }
  } catch {
    return { used: 0, remaining: QUIZ_DAILY_LIMIT, limit: QUIZ_DAILY_LIMIT, resetAt: new Date().toISOString(), hoursUntilReset: 24 }
  }
}

export async function generateAIQuizAction(noteId: string, content: string) {
  const supabase = await createClient()

  try {
    const profile = await loadQuotaProfile(supabase)
    const now = new Date()
    const state = getQuotaState({ count: profile.quiz_count_today, resetAt: new Date(profile.last_quiz_reset_at) }, now)

    if (state.exhausted) {
      return {
        success: false,
        quotaExhausted: true,
        error: `Daily limit reached (${state.limit}/${state.limit} AI generations used). More in about ${state.hoursUntilReset} ${state.hoursUntilReset === 1 ? 'hour' : 'hours'}.`,
      }
    }

    // The full original `content` is still what gets saved to the note
    // below - capSourceText only shrinks what's sent to the model.
    const sourceContent = capSourceText(content);

    const prompt = `You are a study assistant. Extract exactly 10 Vocabulary Flashcards and 10 Quiz Questions from the user's notes.

If the source text already writes a term and its definition together on one line (e.g. "Mitochondria: Powerhouse of the cell" or "Mitochondria - Powerhouse of the cell"), split it: the term becomes the Vocab line, the definition becomes the separate Def line. Never put both the term and its definition inside a single Vocab or Def line.

OUTPUT SYNTAX:

**Vocab:** [Concept 1]
**Def:** [Definition 1]
... (Repeat up to item 10)

**Quiz:** [Question 1]?
**A:** [Correct Answer] | [Distractor 1] | [Distractor 2] | [Distractor 3]
**Explain:** [Brief explanation of the correct answer]
... (Repeat up to item 10)

TEXT CONTENT:
${sourceContent}
`;

    const generatedText = await generateText({ prompt });
    let cleaned = generatedText.replace(/```markdown/g, '').replace(/```/g, '').trim();
    cleaned = cleaned.replace(/<!--.*?-->/g, '').trim();
    cleaned = cleaned.replace(/\*\*(Vocab|Quiz):\*\*/g, '\n\n**$1:**').trim();

    if (!cleaned.includes('**Quiz:**') && !cleaned.includes('**Vocab:**')) {
      throw new Error("Invalid response format from AI");
    }

    const newContent = content + '\n\n' + cleaned + '\n';
    await updateNoteContent(noteId, newContent);

    await supabase
      .from('profiles')
      .update({ quiz_count_today: state.used + 1, last_quiz_reset_at: state.resetAt.toISOString() })
      .eq('id', profile.id)

    return { success: true, remaining: state.remaining - 1, appendedText: cleaned };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Error generating AI quiz:", e);
    return { success: false, error: friendlyAIError(e) };
  }
}

export async function saveMissedQuestionsAction(noteId: string, currentContent: string, missedQuestions: Array<{prompt: string, correct: string, explanation?: string}>) {
  try {
    let toAppend = '\n\n## Missed Questions Review\n\n';
    for (const q of missedQuestions) {
      toAppend += `**Vocab:** ${q.prompt}\n**Def:** ${q.correct}\n\n`;
    }
    await updateNoteContent(noteId, currentContent + toAppend);
    return { success: true };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Error saving missed questions:", e);
    return { success: false, error: e.message };
  }
}
