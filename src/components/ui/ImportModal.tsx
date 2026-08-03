import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { generatePromptsFromFile } from '@/app/notes/[id]/actions';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (generatedPrompts: string) => void;
  subjectId: string;
}

export default function ImportModal({ isOpen, onClose, onImportComplete, subjectId }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type === 'application/pdf' || selected.type.startsWith('image/')) {
        setFile(selected);
        setTextMode(false);
        setError(null);
      } else {
        setError('Please upload a PDF or an Image (PNG/JPEG).');
      }
    }
  };

  const handleImport = async () => {
    setLoading(true);
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

      const markdown = await generatePromptsFromFile(subjectId, formData);
      if (markdown.error) {
        throw new Error(markdown.error);
      }
      
      onImportComplete(markdown.text);
      onClose();
      // Reset state
      setFile(null);
      setPastedText('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong during import.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#14120f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-white mb-6">Import Source Material</h2>

          {/* Toggle Tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl mb-6">
            <button
              onClick={() => setTextMode(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!textMode ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Upload File
            </button>
            <button
              onClick={() => setTextMode(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${textMode ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Paste Text
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {!textMode ? (
            <div 
              className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-accent/50 transition-colors cursor-pointer group bg-black/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
              />
              {file ? (
                <>
                  {file.type === 'application/pdf' ? (
                    <FileText className="w-10 h-10 text-accent mb-3" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-accent mb-3" />
                  )}
                  <p className="text-white font-medium text-sm break-all">{file.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                    <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-accent transition-colors" />
                  </div>
                  <p className="text-gray-300 font-medium mb-1">Click to upload file</p>
                  <p className="text-gray-500 text-xs">PDF or Image (PNG, JPG)</p>
                </>
              )}
            </div>
          ) : (
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste article, notes, or raw text here..."
              className="w-full h-40 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent/50 resize-none"
            />
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || (!textMode && !file) || (textMode && !pastedText.trim())}
              className="px-5 py-2 bg-accent hover:bg-accent-muted text-[#14120f] text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Extract Flashcards'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
