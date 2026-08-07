import { describe, expect, it } from 'vitest';
import {
  parseBlanks,
  renderNoteForPreview,
  parseTimestamp,
  formatTimestamp,
  haveBlanksChanged,
  hasEnoughForPracticeAndQuiz,
} from './parseBlanks';

describe('parseBlanks', () => {
  it('pairs an adjacent Vocab/Def line', () => {
    const md = '**Vocab:** Diminished chord\n**Def:** Tense and unstable.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Diminished chord', answer: 'Tense and unstable.' },
    ]);
  });

  it('accepts a dash in place of the colon for Vocab/Def', () => {
    const md = '**Vocab -** Diminished chord\n**Def -** Tense and unstable.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Diminished chord', answer: 'Tense and unstable.' },
    ]);
  });

  it('accepts a dash in place of the colon for Quiz/A', () => {
    const md = '**Quiz -** What is 2+2?\n**A -** 4 | 5 | 22';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'quiz', prompt: 'What is 2+2?', answer: '4 | 5 | 22' },
    ]);
  });

  it('accepts a dash with no surrounding space, and Def instead of A', () => {
    const md = '**Vocab-**Diminished chord\n**Def-**Tense and unstable.';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 1, kind: 'vocab', prompt: 'Diminished chord', answer: 'Tense and unstable.' },
    ]);
  });

  it('makes a vocab card from a plain "Term: Definition" line, no markup', () => {
    const md = 'Mitochondria: Powerhouse of the cell';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 0, kind: 'vocab', prompt: 'Mitochondria', answer: 'Powerhouse of the cell' },
    ]);
  });

  it('makes a vocab card from a plain "Term - Definition" line, no markup', () => {
    const md = 'Mitochondria - Powerhouse of the cell';
    expect(parseBlanks(md)).toEqual([
      { line: 0, answerLine: 0, kind: 'vocab', prompt: 'Mitochondria', answer: 'Powerhouse of the cell' },
    ]);
  });

  it('does not split a hyphenated word with no surrounding spaces', () => {
    const md = 'T-cell is a type of lymphocyte';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('ignores a plain line with no colon or dash separator', () => {
    const md = 'Just a regular sentence with no separator at all.';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('skips the no-markup fallback inside an imported-source section', () => {
    const md = '## Imported source\n\nChapter 3: Cell Biology\nMitochondria: Powerhouse of the cell';
    expect(parseBlanks(md)).toEqual([]);
  });

  it('still applies the no-markup fallback once a later heading ends the imported section', () => {
    const md = '## Imported source\n\nChapter 3: Cell Biology\n\n## My notes\n\nMitochondria: Powerhouse of the cell';
    expect(parseBlanks(md)).toEqual([
      { line: 6, answerLine: 6, kind: 'vocab', prompt: 'Mitochondria', answer: 'Powerhouse of the cell' },
    ]);
  });

  it('still honors explicit **Vocab:** markup inside an imported-source section', () => {
    const md = '## Imported source\n\n**Vocab:** Mitochondria\n**Def:** Powerhouse of the cell';
    expect(parseBlanks(md)).toEqual([
      { line: 2, answerLine: 3, kind: 'vocab', prompt: 'Mitochondria', answer: 'Powerhouse of the cell' },
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

  it('attaches an **At:** marker to the blank that follows it', () => {
    const md = '**At:** 2:22\n**Vocab:** Term\n**Def:** Definition';
    const [blank] = parseBlanks(md);
    expect(blank.videoT).toBe(142);
  });

  it('attaches a timestamp:// marker to the blank that follows it', () => {
    const md = '[02:22](timestamp://abc?t=142)\n**Vocab:** Term\n**Def:** Definition';
    const [blank] = parseBlanks(md);
    expect(blank.videoT).toBe(142);
  });

  it('attaches a legacy hash #t= marker to the blank that follows it', () => {
    const md = '[02:22](#t=142)\n**Vocab:** Term\n**Def:** Definition';
    const [blank] = parseBlanks(md);
    expect(blank.videoT).toBe(142);
  });

  it('does not carry a marker over to a second, unrelated blank', () => {
    const md = ['**At:** 1:00', '**Vocab:** T1', '**Def:** D1', '**Vocab:** T2', '**Def:** D2'].join('\n');
    const [first, second] = parseBlanks(md);
    expect(first.videoT).toBe(60);
    expect(second.videoT).toBeUndefined();
  });

  it('leaves videoT undefined when there is no marker at all', () => {
    const md = '**Vocab:** Term\n**Def:** Definition';
    expect(parseBlanks(md)[0].videoT).toBeUndefined();
  });
});

describe('parseTimestamp / formatTimestamp', () => {
  it('parses M:SS and H:MM:SS into total seconds', () => {
    expect(parseTimestamp('2:22')).toBe(142);
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('rejects malformed timestamps', () => {
    expect(parseTimestamp('not-a-time')).toBeNull();
    expect(parseTimestamp('5')).toBeNull();
  });

  it('formats seconds back into the same shape it parses', () => {
    expect(formatTimestamp(142)).toBe('2:22');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });
});

describe('haveBlanksChanged', () => {
  it('is false for a prose-only edit that leaves every blank untouched', () => {
    const prev = '**Vocab:** Term\n**Def:** Definition\n\nSome prose.';
    const next = '**Vocab:** Term\n**Def:** Definition\n\nSome different prose entirely.';
    expect(haveBlanksChanged(prev, next)).toBe(false);
  });

  it('is true when a new vocab pair is added', () => {
    const prev = '**Vocab:** Term\n**Def:** Definition';
    const next = '**Vocab:** Term\n**Def:** Definition\n\n**Vocab:** New\n**Def:** New definition';
    expect(haveBlanksChanged(prev, next)).toBe(true);
  });

  it('is true when an existing answer is edited', () => {
    const prev = '**Vocab:** Term\n**Def:** Old definition';
    const next = '**Vocab:** Term\n**Def:** New definition';
    expect(haveBlanksChanged(prev, next)).toBe(true);
  });

  it('is false for whitespace-only changes on non-blank lines', () => {
    const prev = '**Vocab:** Term\n**Def:** Definition\n\nProse.';
    const next = '**Vocab:** Term\n**Def:** Definition\n\n\n\nProse.';
    expect(haveBlanksChanged(prev, next)).toBe(false);
  });

  it('is false comparing identical content', () => {
    const md = '**Quiz:** Q?\n**A:** Correct | Wrong';
    expect(haveBlanksChanged(md, md)).toBe(false);
  });
});

describe('hasEnoughForPracticeAndQuiz', () => {
  const vocabPairs = (n: number) =>
    Array.from({ length: n }, (_, i) => `**Vocab:** T${i}\n**Def:** D${i}`).join('\n\n');
  const quizPairs = (n: number) =>
    Array.from({ length: n }, (_, i) => `**Quiz:** Q${i}?\n**A:** Right${i} | Wrong${i}`).join('\n\n');

  it('is false at 9 vocab pairs', () => {
    expect(hasEnoughForPracticeAndQuiz(vocabPairs(9))).toBe(false);
  });

  it('is true at 10 vocab pairs', () => {
    expect(hasEnoughForPracticeAndQuiz(vocabPairs(10))).toBe(true);
  });

  it('is false at 6 vocab plus 6 quiz - neither kind alone reaches 10', () => {
    const md = vocabPairs(6) + '\n\n' + quizPairs(6);
    expect(hasEnoughForPracticeAndQuiz(md)).toBe(false);
  });

  it('is true at 10 quiz pairs', () => {
    expect(hasEnoughForPracticeAndQuiz(quizPairs(10))).toBe(true);
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
