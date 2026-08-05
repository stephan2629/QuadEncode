import { GoogleGenAI } from '@google/genai'

export interface GenerateInput {
  prompt: string
  image?: { data: string; mimeType: string }
  json?: boolean
  provider?: 'auto' | 'gemini' | 'openai'
}

const GEMINI_RETRY_DELAYS_MS = [1500, 3000]

function isRetryable(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('503') ||
    m.includes('429') ||
    m.includes('quota') ||
    m.includes('resource_exhausted') ||
    m.includes('overloaded') ||
    m.includes('high demand') ||
    m.includes('unavailable')
  )
}

async function generateWithGeminiKey(key: string, input: GenerateInput): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: key })
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: input.prompt },
  ]
  if (input.image) parts.unshift({ inlineData: input.image })

  const params = {
    model: 'gemini-flash-latest',
    contents: [{ role: 'user' as const, parts }],
    ...(input.json ? { config: { responseMimeType: 'application/json' } } : {}),
  }

  let lastErr: Error = new Error('Gemini call failed')
  for (const delay of GEMINI_RETRY_DELAYS_MS) {
    try {
      const res = await ai.models.generateContent(params)
      return res.text || ''
    } catch (err) {
      lastErr = err as Error
      if (!isRetryable(lastErr.message || '')) throw lastErr
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  const res = await ai.models.generateContent(params)
  return res.text || ''
}

async function callGemini(input: GenerateInput): Promise<string> {
  const keys = Object.keys(process.env)
    .filter(k => k.toUpperCase().startsWith('GEMINI_API_KEY'))
    .map(k => process.env[k])
    .filter((k): k is string => !!k && !k.includes('your_'));

  if (keys.length === 0) throw new Error('Gemini API key is missing.')

  // Shuffle keys to load-balance across available API keys and avoid hitting rate limits on the first key
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  let lastErr: Error = new Error('Gemini call failed')
  for (const key of keys) {
    try {
      return await generateWithGeminiKey(key, input)
    } catch (err) {
      lastErr = err as Error
      const errMsg = lastErr.message || '';
      // If error is not retryable AND not an invalid key error, throw it immediately (e.g. bad prompt).
      // Invalid keys should just be skipped so we try the next key.
      if (!isRetryable(errMsg) && !errMsg.includes('API key not valid')) {
        throw lastErr;
      }
    }
  }
  throw lastErr
}

async function callOpenAI(input: GenerateInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI API key is missing.')

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: input.prompt }]
  if (input.image) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${input.image.mimeType};base64,${input.image.data}` },
    })
  }

  // Any OpenAI-compatible endpoint works here, so an OmniRoute-style gateway
  // can be dropped in by setting OPENAI_BASE_URL. Unset means real OpenAI.
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content }],
      ...(input.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI request failed (${res.status})`)
  return data?.choices?.[0]?.message?.content || ''
}

const PROVIDERS: Array<{ name: string; call: (input: GenerateInput) => Promise<string> }> = [
  { name: 'Gemini', call: callGemini },
  { name: 'OpenAI', call: callOpenAI },
]

// Tries configured providers based on input.provider. Defaults to auto (Gemini -> OpenAI fallback).
export async function generateText(input: GenerateInput): Promise<string> {
  const failures: string[] = []
  
  let providersToTry = PROVIDERS;
  if (input.provider === 'gemini') {
    providersToTry = [PROVIDERS[0]];
  } else if (input.provider === 'openai') {
    providersToTry = [PROVIDERS[1]];
  }

  for (const provider of providersToTry) {
    try {
      const text = await provider.call(input)
      if (text.trim()) return text
      failures.push(`${provider.name}: empty response`)
    } catch (err) {
      failures.push(`${provider.name}: ${(err as Error).message}`)
    }
  }

  throw new Error(`All AI providers failed. ${failures.join(' | ')}`)
}
