// Parses the ?? / >> note syntax from CLAUDE.md section 7.
// `line` is the 0-indexed line number of the `??` line, used as the card's
// back pointer (cards.line) to jump into the note editor.
export interface ParsedBlank {
  line: number;
  answerLine: number;
  prompt: string;
  answer: string;
}

const PROMPT_PREFIX = '??';
const ANSWER_PREFIX = '>>';

export function parseBlanks(bodyMd: string): ParsedBlank[] {
  const lines = bodyMd.split('\n');
  const blanks: ParsedBlank[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith(PROMPT_PREFIX)) continue;

    const prompt = line.slice(PROMPT_PREFIX.length).trim();
    if (!prompt) continue;

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;

    if (j < lines.length && lines[j].trim().startsWith(ANSWER_PREFIX)) {
      const answer = lines[j].trim().slice(ANSWER_PREFIX.length).trim();
      blanks.push({ line: i, answerLine: j, prompt, answer });
    }
  }

  return blanks;
}

// Renders ??/>> pairs as styled blockquote callouts for the markdown preview
// pane, so an open blank "shows as a todo in the note" (section 7) without
// needing in-place textarea highlighting.
export function renderNoteForPreview(bodyMd: string): string {
  const lines = bodyMd.split('\n');
  const blanks = parseBlanks(bodyMd);
  if (blanks.length === 0) return bodyMd;

  const out: string[] = [];
  let i = 0;
  let blankIndex = 0;

  while (i < lines.length) {
    const next = blanks[blankIndex];
    if (next && i === next.line) {
      out.push(
        next.answer
          ? `> **Card:** ${next.prompt}\n>\n> ${next.answer}`
          : `> **Open:** ${next.prompt}`
      );
      i = next.answerLine + 1;
      blankIndex++;
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join('\n');
}
