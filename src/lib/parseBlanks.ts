// Parses the natural markdown flashcard syntax from CLAUDE.md section 9:
// **Vocab:**/**Def:** (front/back vocabulary, section 6) and **Quiz:**/**A:**
// (the answer line may hold pipe-separated multiple-choice options;
// ReviewSession splits on '|' itself, so the raw answer text is kept as-is
// here), plus an optional **Explain:** line after the answer, shown when a
// quiz answer is missed. Standard **Q:**/**A:** cards are retired per
// section 6: vocabulary front/back and quiz are the only flashcard formats.
// `line` is the 0-indexed line number of the prompt line, used as the card's
// back pointer (cards.line) to jump into the note editor.
export interface ParsedBlank {
  line: number;
  answerLine: number;
  kind: 'vocab' | 'quiz';
  prompt: string;
  answer: string;
  explanation?: string;
  explanationLine?: number;
  videoT?: number;
}

// Colon is the documented separator (CLAUDE.md section 9), but a dash reads
// just as naturally typed live and shouldn't silently fail to make a card.
// Matched as a pattern (word, optional space, ":" or "-", closing "**")
// rather than an enumerated list of exact strings - "**Vocab:**",
// "**Vocab -**", and "**Vocab-**" all satisfy the same regex instead of each
// spacing variant needing its own hardcoded entry.
const PROMPT_PATTERNS: { re: RegExp; kind: ParsedBlank['kind'] }[] = [
  { re: /^(?:\*\*Vocab\s*[-:]\*\*|Vocab\s*[-:])/, kind: 'vocab' },
  { re: /^(?:\*\*Quiz\s*[-:]\*\*|Quiz\s*[-:])/, kind: 'quiz' },
];
const ANSWER_RE = /^(?:\*\*(?:A|Def)\s*[-:]\*\*|(?:A|Def)\s*[-:])/;
const EXPLAIN_RE = /^\*\*Explain\s*[-:]\*\*/;
const TIMESTAMP_RE = /^\*\*At\s*[-:]\*\*/;

// Fallback for a term and its definition written on one plain line, no
// **Vocab:**/**Def:** markup at all - "Mitochondria: Powerhouse of the
// cell" or "Mitochondria - Powerhouse of the cell". Requires the line to
// start with a letter (excludes **-marked lines, list items, times like
// "10:00 AM") and the dash form to have spaces around it (so it doesn't
// fire on a hyphenated word like "T-cell"). This is a real tradeoff: any
// ordinary sentence shaped like "Term: rest of the line" now becomes a
// card too - accepted because that's the exact syntax asked for, and a
// stray card is a one-tap delete, not a data problem.
const INLINE_VOCAB_RE = /^([A-Za-z][^\n]{1,58}?)(?:: | - )(\S[^\n]{1,300})$/;

// The inline fallback above only applies to text the user typed live, not
// pasted or uploaded material - a pasted article or an extracted PDF page
// is full of ordinary colons and dashes that were never meant to become
// cards. NoteEditor puts imported source text under one of these headings
// (see handleImportComplete); parseBlanks treats everything under one, up
// to the next heading, as off limits for the fallback. Explicit
// **Vocab:**/**Quiz:** markup is unaffected - it works the same everywhere.
const IMPORTED_SECTION_HEADINGS = ['## Imported source', '## Imported Raw Text'];
const HEADING_RE = /^#{1,6}\s/;

function stripMatch(line: string, re: RegExp): string | null {
  const m = line.match(re);
  return m ? line.slice(m[0].length).trim() : null;
}

// "2:22" -> 142, "1:02:03" -> 3723. Companion to formatTimestamp below -
// together they own the **At:** marker's human-readable time format.
export function parseTimestamp(text: string): number | null {
  const parts = text.trim().split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function parseBlanks(bodyMd: string): ParsedBlank[] {
  const lines = bodyMd.split('\n');
  const blanks: ParsedBlank[] = [];
  // The nearest **At:** marker scanned so far, not yet claimed by a blank.
  // Consumed (reset to null) the moment it attaches to one, so it can't also
  // attach to some unrelated blank further down the note.
  let pendingVideoT: number | null = null;
  // Whether the current line falls under an imported-source heading (reset
  // on every heading encountered, including back out of one).
  let insideImportedSection = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (HEADING_RE.test(trimmed)) {
      insideImportedSection = IMPORTED_SECTION_HEADINGS.some((h) => trimmed.startsWith(h));
      continue;
    }

    const timestampUrlMatch = trimmed.match(/timestamp:\/\/[^?)]+\?t=(\d+)/) || trimmed.match(/#t=(\d+)/);
    if (timestampUrlMatch) {
      pendingVideoT = parseInt(timestampUrlMatch[1], 10);
      if (trimmed.startsWith('[') && trimmed.endsWith(')')) {
        // If it's a standalone link on its own line, consume it and continue
        continue;
      }
    } else {
      const timestampVal = stripMatch(trimmed, TIMESTAMP_RE);
      if (timestampVal !== null) {
        const parsed = parseTimestamp(timestampVal);
        if (parsed !== null) pendingVideoT = parsed;
        continue;
      }
    }

    const match = PROMPT_PATTERNS.find((p) => p.re.test(trimmed));
    if (!match) {
      // An unbolded answer label such as "Def - definition" is valid only
      // after a prompt. It must not also become a plain "term - definition"
      // vocabulary card on its own.
      if (ANSWER_RE.test(trimmed) || EXPLAIN_RE.test(trimmed) || TIMESTAMP_RE.test(trimmed)) continue;
      const inline = insideImportedSection ? null : trimmed.match(INLINE_VOCAB_RE);
      if (!inline) continue;
      const blank: ParsedBlank = { line: i, answerLine: i, kind: 'vocab', prompt: inline[1].trim(), answer: inline[2].trim() };
      if (pendingVideoT !== null) {
        blank.videoT = pendingVideoT;
        pendingVideoT = null;
      }
      blanks.push(blank);
      continue;
    }
    const prompt = trimmed.replace(match.re, '').trim();
    if (!prompt) continue;

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j >= lines.length) continue;

    const answer = stripMatch(lines[j].trim(), ANSWER_RE);
    if (answer === null) continue;

    const blank: ParsedBlank = { line: i, answerLine: j, kind: match.kind, prompt, answer };
    if (pendingVideoT !== null) {
      blank.videoT = pendingVideoT;
      pendingVideoT = null;
    }

    let k = j + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    if (k < lines.length) {
      const explanationVal = stripMatch(lines[k].trim(), EXPLAIN_RE);
      if (explanationVal !== null) {
        blank.explanation = explanationVal;
        blank.explanationLine = k;
      }
    }

    blanks.push(blank);
  }

  return blanks;
}

// A comparable fingerprint of everything syncCardsFromNote actually cares
// about - which lines have a real (non-empty-answer) blank, and what each
// one says. Two bodies with the same fingerprint produce the same set of
// cards, so this is what lets updateNoteContent skip the whole card sync
// pass on a prose-only edit (src/app/notes/[id]/actions.ts).
function blankFingerprint(bodyMd: string): string {
  return JSON.stringify(
    parseBlanks(bodyMd)
      .filter((b) => b.answer !== '')
      .map((b) => [b.line, b.kind, b.prompt, b.answer, b.explanation ?? ''])
  );
}

export function haveBlanksChanged(prevBodyMd: string, newBodyMd: string): boolean {
  return blankFingerprint(prevBodyMd) !== blankFingerprint(newBodyMd);
}

// Practice and Quiz tabs (note editor only - not the dashboard's Review
// entry point or /review, which keep the existing "first card exists" rule)
// stay absent until a note holds a real batch: 10+ vocab pairs, or 10+ quiz
// pairs, counted separately so 6 of each doesn't count as "10" of anything.
// Cloze cards don't count - see docs/decisions/0009.
export function hasEnoughForPracticeAndQuiz(bodyMd: string, threshold = 10): boolean {
  const { vocabCount } = getStudyMaterialCounts(bodyMd);
  return vocabCount >= threshold;
}

export function getStudyMaterialCounts(bodyMd: string) {
  const blanks = uniqueStudyBlanks(parseBlanks(bodyMd).filter((b) => b.answer !== ''));
  return {
    vocabCount: blanks.filter((b) => b.kind === 'vocab').length,
    quizCount: blanks.filter((b) => b.kind === 'quiz').length,
  };
}

export function uniqueStudyBlanks(blanks: ParsedBlank[]): ParsedBlank[] {
  const seen = new Set<string>();
  return blanks.filter((blank) => {
    const key = `${blank.kind}\u0000${blank.prompt.trim().toLocaleLowerCase()}\u0000${blank.answer.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Renders card pairs as styled blockquote callouts for the markdown preview
// pane, so an open blank "shows as a todo in the note" (section 7) without
// needing in-place textarea highlighting.
export function renderNoteForPreview(
  bodyMd: string,
  clozeCards: { line: number; prompt: string; answer: string }[] = []
): string {
  const lines = bodyMd.split('\n');
  const blanks = parseBlanks(bodyMd);

  if (blanks.length === 0 && clozeCards.length === 0) return bodyMd;

  const out: string[] = [];
  let i = 0;
  let blankIndex = 0;

  while (i < lines.length) {
    const next = blanks[blankIndex];
    if (next && i === next.line) {
      const explain = next.explanation ? `\n>\n> *Why:* ${next.explanation}` : '';
      out.push(
        next.answer
          ? `> **Card:** ${next.prompt}\n>\n> ${next.answer}${explain}`
          : `> **Open:** ${next.prompt}`
      );
      i = (next.explanationLine ?? next.answerLine) + 1;
      blankIndex++;
    } else {
      out.push(lines[i]);
      
      // Inject cloze card callouts after the line they belong to
      const lineClozes = clozeCards.filter(c => c.line === i);
      for (const cloze of lineClozes) {
        out.push(`> **Cloze:** ${cloze.prompt} *(Answer: ${cloze.answer})*`);
      }
      
      i++;
    }
  }

  return out.join('\n');
}
