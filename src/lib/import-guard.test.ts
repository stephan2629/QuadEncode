import { describe, expect, it } from 'vitest'
import { getImportInputError, MAX_IMAGE_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_TEXT_CHARS } from './import-guard'

describe('getImportInputError', () => {
  it('accepts a supported import within the server limits', () => {
    expect(getImportInputError({ file: { type: 'application/pdf', size: MAX_IMPORT_FILE_BYTES } })).toBeNull()
  })

  it('rejects unsupported and oversized file uploads', () => {
    expect(getImportInputError({ file: { type: 'application/zip', size: 1 } }))
      .toBe('Use a PDF, DOCX, TXT, Markdown, JPEG, PNG, or WebP file.')
    expect(getImportInputError({ file: { type: 'image/png', size: MAX_IMAGE_IMPORT_FILE_BYTES + 1 } }))
      .toContain(`${MAX_IMAGE_IMPORT_FILE_BYTES / (1024 * 1024)} MB`)
  })

  it('rejects a pasted payload that cannot be saved to the note', () => {
    expect(getImportInputError({ text: 'x'.repeat(MAX_IMPORT_TEXT_CHARS + 1) })).toContain('too long')
  })
})
