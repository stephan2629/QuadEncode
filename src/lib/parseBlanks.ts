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
}

const PROMPT_PREFIXES: { prefix: string; kind: ParsedBlank['kind'] }[] = [
  { prefix: '**Vocab:**', kind: 'vocab' },
  { prefix: '**Quiz:**', kind: 'quiz' },
];
const ANSWER_PREFIXES = ['**A:**', '**Def:**'];
const EXPLAIN_PREFIX = '**Explain:**';

function stripPrefix(line: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (line.startsWith(prefix)) return line.slice(prefix.length).trim();
  }
  return null;
}

export function parseBlanks(bodyMd: string): ParsedBlank[] {
  const lines = bodyMd.split('\n');
  const blanks: ParsedBlank[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = PROMPT_PREFIXES.find((p) => trimmed.startsWith(p.prefix));
    if (!match) continue;
    const prompt = trimmed.slice(match.prefix.length).trim();
    if (!prompt) continue;

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j >= lines.length) continue;

    const answer = stripPrefix(lines[j].trim(), ANSWER_PREFIXES);
    if (answer === null) continue;

    const blank: ParsedBlank = { line: i, answerLine: j, kind: match.kind, prompt, answer };

    let k = j + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    if (k < lines.length && lines[k].trim().startsWith(EXPLAIN_PREFIX)) {
      blank.explanation = lines[k].trim().slice(EXPLAIN_PREFIX.length).trim();
      blank.explanationLine = k;
    }

    blanks.push(blank);
  }

  return blanks;
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
