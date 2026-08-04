'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, HelpCircle, Code, Eye } from 'lucide-react';
import MarkdownPreview from '../ui/MarkdownPreview';

export function SplitRecallEditor({ initialMarkdown = '' }: { initialMarkdown?: string }) {
  const [markdown, setMarkdown] = useState(
    initialMarkdown ||
      `# Music Theory Basics\n\n**Vocab:** Cadence\n**Def:** A harmonic progression that creates a sense of resolution or pause at the end of a musical phrase.\n**Explain:** In Western classical music, standard cadences mark structural divisions like punctuation marks in text.\n\n**Quiz:** What interval is created by combining a major third and a minor third?\n**A:** Perfect Fifth | Major Sixth | Octave | Perfect Fourth\n**Explain:** A major third (4 semitones) plus a minor third (3 semitones) equals 7 semitones, forming a Perfect 5th.`
  );

  const [activeTab, setActiveTab] = useState<'parsedCards' | 'formattedDoc'>('parsedCards');

  // Simple live client-side parser to show generated prompts cards preview
  const lines = markdown.split('\n');
  const parsedCards: { type: 'vocab' | 'quiz'; prompt: string; answer: string; explain?: string }[] = [];

  let currentVocab: string | null = null;
  let currentDef: string | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('**Vocab:**')) {
      currentVocab = trimmed.replace('**Vocab:**', '').trim();
    } else if (trimmed.startsWith('**Def:**') && currentVocab) {
      currentDef = trimmed.replace('**Def:**', '').trim();
      parsedCards.push({ type: 'vocab', prompt: currentVocab, answer: currentDef });
      currentVocab = null;
      currentDef = null;
    } else if (trimmed.startsWith('**Quiz:**')) {
      const q = trimmed.replace('**Quiz:**', '').trim();
      parsedCards.push({ type: 'quiz', prompt: q, answer: 'Multiple choice parsed' });
    }
  });

  return (
    <div className="w-full bg-[#14120f]/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-8">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="text-xs font-mono text-gray-400 ml-2">Split-Screen Recall Engine</span>
        </div>

        <div className="flex items-center gap-2 bg-[#0a0908] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('parsedCards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'parsedCards'
                ? 'bg-accent text-[#0a0908] font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Generated Cards ({parsedCards.length})
          </button>
          <button
            onClick={() => setActiveTab('formattedDoc')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'formattedDoc'
                ? 'bg-accent text-[#0a0908] font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Formatted Doc
          </button>
        </div>
      </div>

      {/* Split View Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-[380px]">
        {/* Left Side: Markdown Editor */}
        <div className="p-6 flex flex-col bg-[#0a0908]/50">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 text-accent font-bold">
              <Code className="w-4 h-4" /> Markdown Source
            </span>
            <span className="text-[10px] text-gray-500">Auto-saves on typing</span>
          </div>

          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Type **Vocab:** and **Def:** to automatically generate recall cards..."
            className="w-full flex-1 min-h-[300px] bg-transparent text-gray-200 font-mono text-xs md:text-sm leading-relaxed focus:outline-none resize-none custom-scrollbar"
          />
        </div>

        {/* Right Side: Real-Time Parsed Cards / Preview */}
        <div className="p-6 bg-[#14120f]/60 overflow-y-auto custom-scrollbar max-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'parsedCards' ? (
              <m.div
                key="cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Real-time Parsed Cards
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{parsedCards.length} Active</span>
                </div>

                {parsedCards.length === 0 ? (
                  <div className="p-8 text-center border border-white/5 rounded-2xl bg-black/20">
                    <HelpCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Type **Vocab:** and **Def:** in the left editor to generate cards live!</p>
                  </div>
                ) : (
                  parsedCards.map((c, i) => (
                    <m.div
                      key={i}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-md hover:border-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-accent mb-1.5">
                        {c.type === 'vocab' ? <BookOpen className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5 text-amber-400" />}
                        {c.type === 'vocab' ? 'Flashcard' : 'Quiz Question'}
                      </div>
                      <h5 className="text-sm font-bold font-serif text-white mb-1">{c.prompt}</h5>
                      <p className="text-xs text-gray-300 font-sans">{c.answer}</p>
                    </m.div>
                  ))
                )}
              </m.div>
            ) : (
              <m.div
                key="doc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MarkdownPreview source={markdown} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
