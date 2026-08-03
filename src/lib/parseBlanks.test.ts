import { describe, expect, it } from 'vitest';
import { parseBlanks, renderNoteForPreview } from './parseBlanks';

describe('parseBlanks', () => {
  it('pairs an adjacent ?? / >> line', () => {
    const md = '?? What does a diminished chord sound like?\n>> Tense and unstable.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, prompt: 'What does a diminished chord sound like?', answer: 'Tense and unstable.' },
    ]);
  });

  it('treats an empty >> as an open blank with no answer', () => {
    const md = '?? What is a leading tone?\n>>';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, prompt: 'What is a leading tone?', answer: '' },
    ]);
  });

  it('pairs across blank lines between ?? and >>', () => {
    const md = '?? Question\n\n\n>> Answer';
    expect(parseBlanks(md)).toEqual([{ line: 0, answerLine: 3, prompt: 'Question', answer: 'Answer' }]);
  });

  it('ignores a ?? line with no following >> line', () => {
    const md = '?? Orphaned question\nSome unrelated note text.';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('ignores a ?? line with no prompt text', () => {
    const md = '??\n>> stray answer';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('finds multiple pairs and reports correct line numbers', () => {
    const md = ['# Notes', '', '?? First question', '>> First answer', '', 'Some prose.', '?? Second question', '>> Second answer'].join('\n');
    expect(parseBlanks(md)).toEqual([
      { line: 2, answerLine: 3, prompt: 'First question', answer: 'First answer' },
      { line: 6, answerLine: 7, prompt: 'Second question', answer: 'Second answer' },
    ]);
  });

  it('returns nothing for a note with no blanks', () => {
    expect(parseBlanks('# Just a heading\n\nSome prose.')).toEqual([]);
  });
});

describe('renderNoteForPreview', () => {
  it('leaves a note with no blanks untouched', () => {
    const md = '# Heading\n\nSome prose.';
    expect(renderNoteForPreview(md)).toBe(md);
  });

  it('renders a filled pair as a card callout', () => {
    const md = '?? Question\n>> Answer';
    expect(renderNoteForPreview(md)).toBe('> **Card:** Question\n>\n> Answer');
  });

  it('renders an open blank as an open callout', () => {
    const md = '?? Question\n>>';
    expect(renderNoteForPreview(md)).toBe('> **Open:** Question');
  });

  it('preserves surrounding prose and multiple pairs', () => {
    const md = ['# Notes', '', '?? Q1', '>> A1', '', 'Some prose.', '?? Q2', '>>'].join('\n');
    expect(renderNoteForPreview(md)).toBe(
      ['# Notes', '', '> **Card:** Q1\n>\n> A1', '', 'Some prose.', '> **Open:** Q2'].join('\n')
    );
  });
});
