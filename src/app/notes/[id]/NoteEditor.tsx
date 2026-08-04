'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileDown, Sparkles, FileText, Brain, BookOpen } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import ImportModal from '@/components/ui/ImportModal';
import QuizTab from './QuizTab';
import PracticeTab from './PracticeTab';

const MarkdownPreview = dynamic(() => import('@/components/ui/MarkdownPreview'), { ssr: false });
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), { ssr: false });

import { updateNoteContent, updateNoteTitle, createClozeCard } from './actions';
import { type QuizQuotaInfo } from '@/app/actions/quiz-actions';
import { renderNoteForPreview } from '@/lib/parseBlanks';

interface NoteCard {
  id: string;
  line: number;
  type: string;
  prompt: string;
  answer: string;
  explanation?: string | null;
}

interface NoteData {
  id: string;
  title: string;
  body_md: string;
  subjects: { name: string } | null;
  cards?: NoteCard[];
  pdfUrl?: string | null;
}
type Tab = 'notes' | 'practice' | 'ai-quiz';



export default function NoteEditor({
  noteId,
  initialData,
  quota,
}: {
  noteId: string;
  initialData: NoteData;
  quota: QuizQuotaInfo;
}) {
  const [content, setContent] = useState(initialData.body_md || '');
  const [title, setTitle] = useState(initialData.title || '');
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [showPreview, setShowPreview] = useState(false);
  const [showPdfOnMobile, setShowPdfOnMobile] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [clozeToast, setClozeToast] = useState(false);
  const [cards] = useState<NoteCard[]>(initialData.cards ?? []);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialData.pdfUrl ?? null);
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
    setClozeToast(true);
    setTimeout(() => setClozeToast(false), 1200);
  };

  const handleImportComplete = async (generatedPrompts: string, sourceText?: string, importedPdfUrl?: string | null) => {
    // One "## Open questions" section per note: append under the existing
    // heading if the note already has one.
    const heading = '## Open questions';
    let trimmed = content.replace(/\s*$/, '');

    // Append source text first if it exists
    if (sourceText) {
      trimmed = `${trimmed}\n\n${sourceText.trim()}`;
    }

    const newContent = trimmed.includes(heading)
      ? `${trimmed}\n\n${generatedPrompts}\n`
      : `${trimmed}\n\n${heading}\n\n${generatedPrompts}\n`;
    setContent(newContent);
    setSaveStatus('saving');
    await updateNoteContent(noteId, newContent);
    if (importedPdfUrl) setPdfUrl(importedPdfUrl);
    setSaveStatus('saved');
  };

  const previewSource = renderNoteForPreview(content, clozeCards);

  return (
    <div className="flex flex-col h-screen bg-[#14120f] text-gray-300 selection:bg-accent/30 selection:text-[#14120f]">
      {/* Premium Glassmorphic Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-[#14120f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/dashboard" className="shrink-0 text-gray-500 hover:text-accent transition-colors p-1 hover:bg-accent/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider">
              {initialData.subjects?.name || 'Subject'}
            </span>
              <input
              type="text"
              aria-label="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full min-w-0 truncate bg-transparent text-white font-sans font-bold text-lg focus:outline-none focus:border-b focus:border-accent/50 border-b border-transparent placeholder-gray-600 transition-colors"
              placeholder="Untitled Note"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-xs flex items-center gap-1.5 text-gray-500 px-3 py-1.5 rounded-full bg-white/5" aria-live="polite">
            <Save className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-pulse text-accent' : ''}`} aria-hidden="true" />
            <span className="hidden sm:inline">{saveStatus === 'saving' ? 'Saving…' : 'Saved'}</span>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm text-gray-400 hover:text-accent hover:bg-accent/10 active:scale-95"
            title="Import File"
            aria-label="Import File"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Import</span>
          </button>
          <div className="flex bg-[#1a1815] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${!showPreview ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Edit
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${showPreview ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <span className="md:hidden">Preview</span>
              <span className="hidden md:inline">Split</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center px-4 border-b border-white/5 bg-[#14120f] gap-4">
        <button 
          onClick={() => setActiveTab('notes')} 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <FileText className="w-4 h-4" /> Notes
        </button>
        <button 
          onClick={() => setActiveTab('practice')} 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'practice' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <BookOpen className="w-4 h-4" /> Practice
        </button>
        <button 
          onClick={() => setActiveTab('ai-quiz')} 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai-quiz' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <Brain className="w-4 h-4" /> AI Quiz
        </button>
      </div>



      {/* Editor Surface */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full relative">
            {/* Mobile / Tablet PDF Toggle */}
            {pdfUrl && (
              <div className="lg:hidden flex p-2 border-b border-white/5 bg-[#14120f] shrink-0 justify-center">
                <div className="flex bg-[#1a1815] p-1 rounded-lg border border-white/5 w-full max-w-[300px]">
                  <button
                    onClick={() => setShowPdfOnMobile(false)}
                    className={`flex-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${!showPdfOnMobile ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Note Editor
                  </button>
                  <button
                    onClick={() => setShowPdfOnMobile(true)}
                    className={`flex-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${showPdfOnMobile ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Source PDF
                  </button>
                </div>
              </div>
            )}

            {/* Desktop PDF Viewer */}
            {pdfUrl && (
              <div className="hidden lg:flex w-1/2 border-r border-white/5 h-full p-4">
                <PDFViewer url={pdfUrl} />
              </div>
            )}

            {/* Mobile PDF Viewer */}
            {pdfUrl && showPdfOnMobile && (
              <div className="flex-1 flex flex-col h-full overflow-hidden lg:hidden p-4">
                <PDFViewer url={pdfUrl} />
              </div>
            )}

            {/* Note Editor Area */}
            <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${pdfUrl && showPdfOnMobile ? 'hidden lg:flex' : 'flex'}`}>
              <m.div
                layout
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={`flex-1 flex flex-col h-full ${showPreview ? 'hidden md:flex md:w-1/2 md:border-r md:border-white/5' : 'w-full max-w-3xl mx-auto'}`}
              >
                <details className="w-full mt-6 px-8 md:px-12 text-sm text-gray-500 cursor-pointer group select-none">
                  <summary className="font-mono tracking-wider outline-none text-xs uppercase hover:text-gray-300 transition-colors flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Markdown Triggers
                  </summary>
                  <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col gap-2 font-mono text-xs cursor-text">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#14120f] border border-white/5 p-2 rounded-md gap-2">
                      <span className="text-gray-400">**Vocab:** Word<br/>**Def:** Meaning</span>
                      <span className="text-gray-500 hidden sm:inline">➔ Auto-generates Front/Back Flashcard</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#14120f] border border-white/5 p-2 rounded-md gap-2">
                      <span className="text-gray-400">**Quiz:** Question<br/>**A:** Correct | Option 2 | Option 3</span>
                      <span className="text-gray-500 hidden sm:inline">➔ Auto-generates AI Quiz Block</span>
                    </div>
                  </div>
                </details>

                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className="relative flex-1 group mt-4 md:mt-6 mb-12"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl" />
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="absolute inset-0 w-full h-full p-8 md:p-12 bg-transparent resize-none focus:outline-none text-gray-200 text-lg md:text-xl leading-[1.8] font-serif custom-scrollbar placeholder:text-gray-700 placeholder:font-light"
                    aria-label="Note content"
                    placeholder="Start typing..."
                    spellCheck="false"
                  />
                </m.div>
              </m.div>

              {/* Live Preview Pane */}
              <AnimatePresence>
                {showPreview && (
                  <m.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                    className="w-full md:w-1/2 h-full overflow-y-auto bg-[#0a0908] p-6 md:p-10 custom-scrollbar shadow-inner"
                  >
                    <MarkdownPreview source={previewSource} />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'practice' && (
          <PracticeTab cards={cards} />
        )}

        {activeTab === 'ai-quiz' && (
          <QuizTab
            noteId={noteId}
            content={content}
            quota={quota}
          />
        )}

        {/* Instant feedback when Cmd+K turns a selection into a card */}
        <AnimatePresence>
          {clozeToast && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed top-20 right-4 z-20 flex items-center gap-2 bg-accent text-[#0a0908] text-sm font-bold px-4 py-2 rounded-lg shadow-lg"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Card created
            </m.div>
          )}
        </AnimatePresence>
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
