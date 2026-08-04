'use client';

import { useState, useEffect, useRef, useDeferredValue } from 'react';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileDown, FileText, Brain, BookOpen, HelpCircle } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import ImportModal from '@/components/ui/ImportModal';
import GuideModal from '@/components/ui/GuideModal';
import QuizTab from './QuizTab';
import PracticeTab from './PracticeTab';

import { toast } from 'sonner';

const MarkdownPreview = dynamic(() => import('@/components/ui/MarkdownPreview'), { ssr: false });
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), { ssr: false });
const VideoPlayer = dynamic(() => import('@/components/video/VideoPlayer'), { ssr: false });

import { updateNoteContent, updateNoteTitle, createClozeCard } from './actions';

import { renderNoteForPreview, formatTimestamp } from '@/lib/parseBlanks';

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
  video_id?: string | null;
}
type Tab = 'notes' | 'practice' | 'quiz';

const TABS: { id: Tab; label: string; Icon: typeof FileText }[] = [
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'practice', label: 'Practice', Icon: BookOpen },
  { id: 'quiz', label: 'Quiz', Icon: Brain },
];



export default function NoteEditor({
  noteId,
  initialData,
}: {
  noteId: string;
  initialData: NoteData;
}) {
  const [content, setContent] = useState(initialData.body_md || '');
  const [title, setTitle] = useState(initialData.title || '');
  const [activeTab, setActiveTab] = useSessionStorage<Tab>(`note-${noteId}-activeTab`, 'notes');
  const [showPreview, setShowPreview] = useSessionStorage(`note-${noteId}-showPreview`, false);
  const [showPdfOnMobile, setShowPdfOnMobile] = useSessionStorage(`note-${noteId}-showPdf`, false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialData.pdfUrl ?? null);
  const [videoId] = useState<string | null>(initialData.video_id ?? null);
  const [showVideoOnMobile, setShowVideoOnMobile] = useSessionStorage(`note-${noteId}-showVideo`, false);
  const [clozeCards, setClozeCards] = useState(
    initialData.cards?.filter((c) => c.type === 'cloze').map(c => ({ line: c.line, prompt: c.prompt, answer: c.answer })) || []
  );

  const deferredContent = useDeferredValue(content);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  // Arrow/Home/End move focus between tabs and switch immediately, matching
  // the standard ARIA tablist keyboard pattern instead of relying on Tab key
  // presses to step through each one.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentId: Tab) => {
    const i = TABS.findIndex((t) => t.id === currentId);
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIndex = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex === null) return;

    e.preventDefault();
    const nextId = TABS[nextIndex].id;
    setActiveTab(nextId);
    tabRefs.current[nextId]?.focus();
  };
  const searchParams = useSearchParams();
  // Derived directly from the URL at render time rather than synced through
  // an effect + setState, which would trigger an extra render on mount for
  // no benefit - the value is only ever needed once, as VideoPlayer's
  // initial seek target.
  const [seekToSeconds] = useState<number | undefined>(() => {
    const tParam = searchParams.get('t');
    if (tParam === null) return undefined;
    const seconds = Number(tParam);
    return Number.isFinite(seconds) ? seconds : undefined;
  });

  const handleContentChange = (value: string) => {
    setContent(value);
    setSaveStatus(value === initialData.body_md ? 'saved' : 'saving');
  };

  // Section 9's quick-action buttons: insert a blank template at the cursor
  // rather than just appending, so a template can land wherever the user is
  // already writing instead of always jumping to the end of the note.
  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;
    const pos = textarea?.selectionStart ?? content.length;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const leadingBreak = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
    const insertion = `${leadingBreak}${template}\n`;
    handleContentChange(before + insertion + after);

    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const cursor = before.length + insertion.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  // The video's current position becomes a **At:** marker at the cursor -
  // just a third caller of insertTemplate, sourced from live player state
  // instead of a static string. syncCardsFromNote picks it up from there.
  const handleCaptureTimestamp = (seconds: number) => {
    insertTemplate(`**At:** ${formatTimestamp(seconds)}`);
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
    toast.success('Card created');
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
    toast.success('Import completed successfully!');
  };

  const previewSource = renderNoteForPreview(deferredContent, clozeCards);

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-[#14120f] text-gray-300 selection:bg-accent/30 selection:text-[#14120f]">
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
            onClick={() => setIsGuideModalOpen(true)}
            className="px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm text-gray-400 hover:text-accent hover:bg-accent/10 active:scale-95"
            title="Editor Guide"
            aria-label="Editor Guide"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Guide</span>
          </button>

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
      <div role="tablist" aria-label="Note sections" className="flex items-center justify-center px-4 border-b border-white/5 bg-[#14120f] gap-1 sm:gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            ref={(el) => { tabRefs.current[id] = el; }}
            role="tab"
            id={`tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(e) => handleTabKeyDown(e, id)}
            className={`relative px-3 sm:px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors rounded-t-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] ${activeTab === id ? 'text-accent' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Icon className="w-4 h-4" /> {label}
            {activeTab === id && (
              <m.div
                layoutId="note-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Editor Surface */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'notes' && (
            <m.div
              key="notes-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="tabpanel"
              id="panel-notes"
              aria-labelledby="tab-notes"
              tabIndex={0}
              className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-full relative"
            >
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

              {/* Mobile / Tablet Video Toggle */}
              {videoId && (
                <div className="lg:hidden flex p-2 border-b border-white/5 bg-[#14120f] shrink-0 justify-center">
                  <div className="flex bg-[#1a1815] p-1 rounded-lg border border-white/5 w-full max-w-[300px]">
                    <button
                      onClick={() => setShowVideoOnMobile(false)}
                      className={`flex-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${!showVideoOnMobile ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Note Editor
                    </button>
                    <button
                      onClick={() => setShowVideoOnMobile(true)}
                      className={`flex-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${showVideoOnMobile ? 'bg-[#2a2723] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Video
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Video Player */}
              {videoId && (
                <div className="hidden lg:flex w-1/2 border-r border-white/5 h-full p-4">
                  <VideoPlayer videoId={videoId} seekToSeconds={seekToSeconds} onCapture={handleCaptureTimestamp} />
                </div>
              )}

              {/* Mobile Video Player */}
              {videoId && showVideoOnMobile && (
                <div className="flex-1 flex flex-col h-full overflow-hidden lg:hidden p-4">
                  <VideoPlayer videoId={videoId} seekToSeconds={seekToSeconds} onCapture={handleCaptureTimestamp} />
                </div>
              )}

              {/* Note Editor Area */}
              <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${(pdfUrl && showPdfOnMobile) || (videoId && showVideoOnMobile) ? 'hidden lg:flex' : 'flex'}`}>
                <m.div
                  layout
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className={`flex-1 flex flex-col h-full ${showPreview ? 'hidden md:flex md:w-1/2 md:border-r md:border-white/5' : 'w-full max-w-3xl mx-auto'}`}
                >
                  <m.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                    className="relative flex-1 group mt-4 md:mt-6 mb-12 flex"
                  >
                    <textarea
                      ref={textareaRef}
                      aria-label="Note content"
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Start writing..."
                      className="w-full h-full resize-none bg-transparent text-gray-300 font-sans leading-relaxed focus:outline-none placeholder-gray-600 custom-scrollbar p-8 md:p-12 rounded-2xl border border-transparent hover:border-white/5 focus:border-white/10 transition-colors"
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
            </m.div>
          )}

          {activeTab === 'practice' && (
            <m.div
              key="practice-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="tabpanel"
              id="panel-practice"
              aria-labelledby="tab-practice"
              tabIndex={0}
              className="flex-1 flex flex-col overflow-hidden w-full h-full relative bg-[#0a0908]"
            >
              <PracticeTab content={content} clozeCards={clozeCards} />
            </m.div>
          )}

          {activeTab === 'quiz' && (
            <m.div
              key="quiz-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              role="tabpanel"
              id="panel-quiz"
              aria-labelledby="tab-quiz"
              tabIndex={0}
              className="flex-1 flex flex-col overflow-hidden w-full h-full relative"
            >
              <QuizTab noteId={noteId} content={content} />
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
      
      <GuideModal 
        isOpen={isGuideModalOpen} 
        onClose={() => setIsGuideModalOpen(false)} 
      />
    </div>
  );
}
