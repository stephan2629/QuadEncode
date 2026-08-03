'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Layout, Columns, Save, FileDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import ImportModal from '@/components/ui/ImportModal';

const MarkdownPreview = dynamic(() => import('@/components/ui/MarkdownPreview'), { ssr: false });
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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

  const handleImportComplete = async (generatedPrompts: string) => {
    // One "## Open questions" section per note: append under the existing
    // heading if the note already has one.
    const heading = '## Open questions';
    const trimmed = content.replace(/\s*$/, '');
    const newContent = trimmed.includes(heading)
      ? `${trimmed}\n\n${generatedPrompts}\n`
      : `${trimmed}\n\n${heading}\n\n${generatedPrompts}\n`;
    setContent(newContent);
    setSaveStatus('saving');
    await updateNoteContent(noteId, newContent);
    setSaveStatus('saved');
  };

  const previewSource = renderNoteForPreview(content, clozeCards);

  return (
    <div className="flex flex-col h-screen bg-[#0a0908] text-gray-300 selection:bg-accent/30 selection:text-[#0a0908]">
      {/* Premium Glassmorphic Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0908]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-accent transition-colors p-1 hover:bg-accent/10 rounded-lg">
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
              className="bg-transparent text-white font-sans font-bold text-lg focus:outline-none focus:border-b focus:border-accent/50 border-b border-transparent placeholder-gray-600 transition-colors"
              placeholder="Untitled Note"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-xs flex items-center gap-1.5 text-gray-500 px-3 py-1.5 rounded-full bg-white/5" aria-live="polite">
            <Save className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-pulse text-accent' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">{saveStatus === 'saving' ? 'Saving…' : 'Saved'}</span>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm text-gray-400 hover:text-accent hover:bg-accent/10 active:scale-95"
            title="Import File"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Import</span>
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm active:scale-95 ${showPreview ? 'bg-accent text-[#0a0908] font-bold shadow-[0_0_15px_rgba(var(--accent),0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/10 font-medium'}`}
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
          <div className="relative flex-1 group">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full h-full p-6 md:p-10 bg-transparent resize-none focus:outline-none text-gray-200 text-sm md:text-base leading-relaxed font-mono custom-scrollbar"
              aria-label="Note content"
              placeholder="Start typing in markdown… (use **bold**, # headers, ?? / >> for a recall prompt, and select text + Cmd+K for a cloze card)"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Live Preview Pane */}
        {showPreview && (
          <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#0a0908] p-6 md:p-10 custom-scrollbar shadow-inner">
            <MarkdownPreview source={previewSource} />
          </div>
        )}
      </main>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        noteId={noteId}
      />
    </div>
  );
}
