import { describe, expect, it } from 'vitest';
import { parseBlanks, renderNoteForPreview } from './parseBlanks';

describe('parseBlanks', () => {
  it('pairs an adjacent Vocab/Def line', () => {
    const md = '**Vocab:** Diminished chord\n**Def:** Tense and unstable.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Diminished chord', answer: 'Tense and unstable.' },
    ]);
  });

  it('treats an empty answer as an open blank with no answer', () => {
    const md = '**Vocab:** Leading tone\n**Def:**';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Leading tone', answer: '' },
    ]);
  });

  it('pairs across blank lines between prompt and answer', () => {
    const md = '**Vocab:** Term\n\n\n**Def:** Definition';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 3, kind: 'vocab', prompt: 'Term', answer: 'Definition' },
    ]);
  });

  it('ignores a prompt line with no following answer line', () => {
    const md = '**Vocab:** Orphaned term\nSome unrelated note text.';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('ignores a prompt line with no prompt text', () => {
    const md = '**Vocab:**\n**Def:** stray answer';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('ignores retired **Q:**/**A:** syntax entirely', () => {
    const md = '**Q:** What does a diminished chord sound like?\n**A:** Tense and unstable.';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('finds multiple pairs and reports correct line numbers', () => {
    const md = ['# Notes', '', '**Vocab:** First term', '**Def:** First definition', '', 'Some prose.', '**Vocab:** Second term', '**Def:** Second definition'].join('\n');
    expect(parseBlanks(md)).toEqual([
      { line: 2, answerLine: 3, kind: 'vocab', prompt: 'First term', answer: 'First definition' },
      { line: 6, answerLine: 7, kind: 'vocab', prompt: 'Second term', answer: 'Second definition' },
    ]);
  });

  it('parses a Quiz prompt and keeps pipe-separated options in the answer', () => {
    const md = '**Quiz:** What is the APIPA range?\n**A:** 169.254.0.0/16 | 192.168.0.0/16 | 10.0.0.0/8';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'quiz', prompt: 'What is the APIPA range?', answer: '169.254.0.0/16 | 192.168.0.0/16 | 10.0.0.0/8' },
    ]);
  });

  it('returns nothing for a note with no blanks', () => {
    expect(parseBlanks('# Just a heading\n\nSome prose.')).toEqual([]);
  });

  it('captures an Explain line following the answer', () => {
    const md = '**Quiz:** What is the APIPA range?\n**A:** 169.254.0.0/16 | 192.168.0.0/16\n**Explain:** APIPA is reserved for automatic private addressing.';
    expect(parseBlanks(md)).toEqual([
      {
        line: 0,
        answerLine: 1,
        kind: 'quiz',
        prompt: 'What is the APIPA range?',
        answer: '169.254.0.0/16 | 192.168.0.0/16',
        explanation: 'APIPA is reserved for automatic private addressing.',
        explanationLine: 2,
      },
    ]);
  });

  it('finds an Explain line across blank lines and keeps later line numbers correct', () => {
    const md = ['**Vocab:** T1', '**Def:** D1', '', '**Explain:** Because reasons.', '', '**Vocab:** T2', '**Def:** D2'].join('\n');
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'T1', answer: 'D1', explanation: 'Because reasons.', explanationLine: 3 },
      { line: 5, answerLine: 6, kind: 'vocab', prompt: 'T2', answer: 'D2' },
    ]);
  });

  it('leaves explanation undefined when no Explain line follows', () => {
    const md = '**Vocab:** Term\n**Def:** Definition\n\nSome unrelated prose.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Term', answer: 'Definition' },
    ]);
  });
});

describe('renderNoteForPreview', () => {
  it('leaves a note with no blanks untouched', () => {
    const md = '# Heading\n\nSome prose.';
    expect(renderNoteForPreview(md)).toBe(md);
  });

  it('renders a filled pair as a card callout', () => {
    const md = '**Vocab:** Term\n**Def:** Definition';
    expect(renderNoteForPreview(md)).toBe('> **Card:** Term\n>\n> Definition');
  });

  it('renders an open blank as an open callout', () => {
    const md = '**Vocab:** Term\n**Def:**';
    expect(renderNoteForPreview(md)).toBe('> **Open:** Term');
  });

  it('preserves surrounding prose and multiple pairs', () => {
    const md = ['# Notes', '', '**Vocab:** T1', '**Def:** D1', '', 'Some prose.', '**Vocab:** T2', '**Def:**'].join('\n');
    expect(renderNoteForPreview(md)).toBe(
      ['# Notes', '', '> **Card:** T1\n>\n> D1', '', 'Some prose.', '> **Open:** T2'].join('\n')
    );
  });

  it('folds an Explain line into the callout instead of printing it twice', () => {
    const md = ['**Vocab:** T1', '**Def:** D1', '**Explain:** Because reasons.', 'Some prose.'].join('\n');
    expect(renderNoteForPreview(md)).toBe(
      ['> **Card:** T1\n>\n> D1\n>\n> *Why:* Because reasons.', 'Some prose.'].join('\n')
    );
  });
});
