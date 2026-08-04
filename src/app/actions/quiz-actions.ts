'use server'

import { createClient } from '@/utils/supabase/server'
import { generateText } from '@/lib/ai'
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
}

export async function getQuizQuota(): Promise<QuizQuotaInfo> {
  try {
    const supabase = await createClient()
    const profile = await loadQuotaProfile(supabase)
    const state = getQuotaState({ count: profile.quiz_count_today, resetAt: new Date(profile.last_quiz_reset_at) })
    return { used: state.used, remaining: state.remaining, limit: state.limit, resetAt: state.resetAt.toISOString() }
  } catch {
    return { used: 0, remaining: QUIZ_DAILY_LIMIT, limit: QUIZ_DAILY_LIMIT, resetAt: new Date().toISOString() }
  }
}

function hoursUntil(target: Date, now: Date): number {
  return Math.max(1, Math.ceil((target.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / (60 * 60 * 1000)))
}

export async function generateAIQuizAction(noteId: string, content: string) {
  const supabase = await createClient()

  try {
    const profile = await loadQuotaProfile(supabase)
    const now = new Date()
    const state = getQuotaState({ count: profile.quiz_count_today, resetAt: new Date(profile.last_quiz_reset_at) }, now)

    if (state.exhausted) {
      const hours = hoursUntil(state.resetAt, now)
      return {
        success: false,
        quotaExhausted: true,
        error: `You've used both AI quizzes for today. More in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.`,
      }
    }

    const prompt = `You are an expert tutor creating a quiz based on the user's study notes.
Generate AT LEAST 10 multiple-choice questions based on the provided text.
CRITICAL RULES:
1. Output ONLY raw text in the exact format below, with NO markdown wrappers or intro text.
2. Format each question exactly like this:
**Quiz:** [Question text]
**A:** [Correct] | [Wrong 1] | [Wrong 2] | [Wrong 3]

TEXT CONTENT:
${content}
`;

    const generatedText = await generateText({ prompt });
    let cleaned = generatedText.replace(/```markdown/g, '').replace(/```/g, '').trim();
    cleaned = cleaned.replace(/\*\*Quiz:\*\*/g, '\n\n**Quiz:**').trim();

    if (!cleaned.includes('**Quiz:**')) {
      throw new Error("Invalid response format from AI");
    }

    const newContent = content + '\n\n## Generated AI Quiz\n\n' + cleaned + '\n';
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
