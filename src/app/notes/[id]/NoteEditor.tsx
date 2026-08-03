'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Layout, Columns, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { updateNoteContent, updateNoteTitle, createClozeCard } from './actions';
import { renderNoteForPreview } from '@/lib/parseBlanks';

interface NoteData {
  id: string;
  title: string;
  body_md: string;
  subjects: { name: string } | null;
  cards?: { id: string; line: number; type: string; prompt: string; answer: string }[];
}

export default function NoteEditor({
  noteId,
  initialData
}: {
  noteId: string;
  initialData: NoteData
}) {
  const [content, setContent] = useState(initialData.body_md || '');
  const [title, setTitle] = useState(initialData.title || '');
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [clozeCards, setClozeCards] = useState(
    initialData.cards?.filter((c) => c.type === 'cloze').map(c => ({ line: c.line, prompt: c.prompt, answer: c.answer })) || []
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();

  const handleContentChange = (value: string) => {
    setContent(value);
    setSaveStatus(value === initialData.body_md ? 'saved' : 'saving');
  };

  // Auto-save logic for content
  useEffect(() => {
    if (content === initialData.body_md) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      await updateNoteContent(noteId, content);
      setSaveStatus('saved');
    }, 1000); // 1s debounce

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [content, noteId, initialData.body_md]);

  // Handle Title Blur (save on blur rather than keystroke for title)
  const handleTitleBlur = async () => {
    if (title !== initialData.title) {
      setSaveStatus('saving');
      await updateNoteTitle(noteId, title);
      setSaveStatus('saved');
    }
  };

  // Back pointer: jump to a specific line, e.g. from a failed review (?line=N)
  useEffect(() => {
    const lineParam = searchParams.get('line');
    const textarea = textareaRef.current;
    if (lineParam === null || !textarea) return;

    const lineIndex = Number(lineParam);
    const lines = content.split('\n');
    const offset = lines.slice(0, lineIndex).reduce((sum, l) => sum + l.length + 1, 0);

    textarea.focus();
    textarea.setSelectionRange(offset, offset + (lines[lineIndex]?.length ?? 0));
    textarea.scrollTop = Math.max(0, (lineIndex - 3) * 20);
    // Only run once on mount for the initial jump target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd+K (Mac) or Ctrl+K (Windows): selected text becomes a cloze card.
  // Doesn't touch the note body — the card is created directly.
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== 'k') return;
    e.preventDefault();

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;

    const selected = content.slice(start, end);
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = content.indexOf('\n', end);
    const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
    const lineText = content.slice(lineStart, lineEnd);
    const lineNumber = content.slice(0, lineStart).split('\n').length - 1;

    const selectedOffsetInLine = start - lineStart;
    const prompt =
      lineText.slice(0, selectedOffsetInLine) + '___' + lineText.slice(selectedOffsetInLine + selected.length);

    setSaveStatus('saving');
    await createClozeCard(noteId, lineNumber, prompt.trim(), selected.trim());
    setClozeCards((prev) => [...prev, { line: lineNumber, prompt: prompt.trim(), answer: selected.trim() }]);
    setSaveStatus('saved');
  };

  const previewSource = renderNoteForPreview(content, clozeCards);

  return (
    <div className="flex flex-col h-screen bg-[#0a0908] text-gray-300">
      {/* Minimal Chrome Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#14120f]">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider">
              {initialData.subjects?.name || 'Subject'}
            </span>
            <input
              type="text"
              aria-label="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="bg-transparent text-white font-serif font-bold text-lg focus:outline-none focus:border-b focus:border-white/20 border-b border-transparent placeholder-gray-600"
              placeholder="Untitled Note"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs flex items-center gap-1 text-gray-500" aria-live="polite">
            <Save className="w-3 h-3" aria-hidden="true" />
            {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${showPreview ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Toggle Preview"
          >
            {showPreview ? <Layout className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
            <span className="hidden sm:inline">{showPreview ? 'Editor Only' : 'Split View'}</span>
          </button>
        </div>
      </header>

      {/* Editor Surface */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${showPreview ? 'hidden md:flex md:w-1/2 md:border-r md:border-white/5' : 'w-full max-w-4xl mx-auto'}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full p-4 sm:p-6 md:p-10 bg-transparent resize-none focus:outline-none text-white text-sm md:text-base leading-relaxed font-mono selection:bg-accent/30"
            aria-label="Note content"
            placeholder="Start typing in markdown… (use **bold**, # headers, ?? / >> for a recall prompt, and select text + Cmd+K for a cloze card)"
            spellCheck="false"
          />
        </div>

        {/* Live Preview Pane */}
        {showPreview && (
          <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#14120f]/50 p-4 sm:p-6 md:p-10 custom-scrollbar">
            <div className="prose prose-sm md:prose-base prose-invert prose-amber max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewSource || '*Preview will appear here*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
