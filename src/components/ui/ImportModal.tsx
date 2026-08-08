import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { X, UploadCloud, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { generatePromptsFromFile } from '@/app/notes/[id]/actions';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (generatedPrompts: string, sourceText?: string, pdfUrl?: string | null) => void;
  noteId: string;
  initialText?: string;
}

export default function ImportModal({ isOpen, onClose, onImportComplete, noteId, initialText = '' }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !initialText) return;
    // Defer the prefill until after this render commits. The modal is opened
    // by an editor paste event, so this is synchronization with that external
    // event rather than state derived during render.
    const frame = requestAnimationFrame(() => {
      setTextMode(true);
      setPastedText(initialText);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialText, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'].includes(selected.type) || selected.type.startsWith('image/')) {
        setFile(selected);
        setTextMode(false);
        setError(null);
      } else {
        setError('Use a PDF, DOCX, TXT, Markdown, or image file.');
      }
    }
  };

  const loadingMessages = [
    "Uploading document...",
    "Extracting text...",
    "Analyzing content with AI...",
    "Generating flashcards...",
    "Formatting study notes...",
    "Almost there..."
  ];

  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Reset happens where loading actually starts (handleImport), not here -
  // this effect only owns the timer subscription itself.
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  const handleImport = async () => {
    setLoading(true);
    setLoadingTextIndex(0);
    setError(null);
    try {
      const formData = new FormData();
      if (!textMode && file) {
        formData.append('file', file);
      } else if (textMode && pastedText.trim()) {
        formData.append('text', pastedText.trim());
      } else {
        throw new Error('Please provide a file or paste some text.');
      }
      
      formData.append('provider', 'auto');

      const markdown = await generatePromptsFromFile(noteId, formData);
      if (markdown.error || !markdown.text) {
        throw new Error(markdown.error || 'Import failed.');
      }
      onImportComplete(markdown.text, markdown.sourceText || undefined, markdown.pdfUrl);
      onClose();
      // Reset state
      setFile(null);
      setPastedText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during import.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg">
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-[#0a0908]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Subtle gradient glow behind the modal content */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-accent/10 blur-[60px] pointer-events-none" />
          <div className="relative z-10">
            <button
              onClick={onClose}
              aria-label="Close import modal"
              className="absolute -top-2 -right-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Import source material</h2>
            <p className="-mt-4 mb-5 text-xs text-gray-400" aria-live="polite">
              AI imports are limited to 3 per subject in each 24-hour window.
            </p>

            {/* Toggle Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5 relative">
              <button
                onClick={() => setTextMode(false)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${!textMode ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Upload File
              </button>
              <button
                onClick={() => setTextMode(true)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${textMode ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Paste Text
              </button>
              {/* Animated pill background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white/10 rounded-lg transition-all duration-300 ease-out ${textMode ? 'left-[calc(50%+0.125rem)]' : 'left-1'}`}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            {!textMode ? (
              <div 
                className="relative border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-accent/60 transition-all duration-300 cursor-pointer group bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <input
                  type="file"
                  id="import-file"
                  name="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/png,image/jpeg,image/webp,.md,.docx"
                  className="hidden"
                />
                {file ? (
                  <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    {file.type === 'application/pdf' ? (
                      <FileText className="w-12 h-12 text-accent mb-4 drop-shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-accent mb-4 drop-shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
                    )}
                    <p className="text-white font-medium text-sm break-all max-w-full px-4">{file.name}</p>
                    <p className="text-gray-500 text-xs mt-2 bg-black/50 px-3 py-1 rounded-full">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                      <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-accent transition-colors" />
                    </div>
                    <p className="text-gray-200 font-semibold mb-2">Click to upload file</p>
                    <p className="text-gray-500 text-xs max-w-[220px]">Supports PDF, DOCX, TXT, Markdown, and note images</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your article, notes, or raw text here..."
                className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-base md:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/60 resize-none custom-scrollbar transition-colors shadow-inner"
              />
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3 relative z-10">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || (!textMode && !file) || (textMode && !pastedText.trim())}
              className="px-6 py-2.5 bg-accent hover:bg-accent-muted text-[#14120f] text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:grayscale flex items-center gap-2 shadow-[0_0_20px_rgba(var(--accent),0.4)] hover:shadow-[0_0_25px_rgba(var(--accent),0.6)] active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {textMode ? "Uploading..." : loadingMessages[loadingTextIndex]}
                </>
              ) : (
                'Upload Notes'
              )}
            </button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
