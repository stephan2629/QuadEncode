export const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024
export const MAX_IMAGE_IMPORT_FILE_BYTES = 10 * 1024 * 1024
export const MAX_IMPORT_TEXT_CHARS = 500_000

export const ACCEPTED_IMPORT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/markdown',
])

export interface ImportInputMetadata {
  file?: { size: number; type: string }
  text?: string
}

export function getImportInputError({ file, text }: ImportInputMetadata): string | null {
  if (!file && !text) return 'Choose a PDF, image, or pasted text to import.'
  if (text && text.length > MAX_IMPORT_TEXT_CHARS) {
    return `Pasted text is too long. Keep it under ${MAX_IMPORT_TEXT_CHARS.toLocaleString()} characters.`
  }
  if (!file) return null
  if (!ACCEPTED_IMPORT_MIME_TYPES.has(file.type)) return 'Use a PDF, DOCX, TXT, Markdown, JPEG, PNG, or WebP file.'
  if (file.type.startsWith('image/') && file.size > MAX_IMAGE_IMPORT_FILE_BYTES) {
    return `Images must be ${MAX_IMAGE_IMPORT_FILE_BYTES / (1024 * 1024)} MB or smaller.`
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return `Files must be ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB or smaller.`
  }
  return null
}
