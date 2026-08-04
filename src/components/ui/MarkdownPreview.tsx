'use client';

import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, HelpCircle, Quote } from 'lucide-react';

export default function MarkdownPreview({
  source,
  onTimestampClick,
}: {
  source: string;
  onTimestampClick?: (time: number) => void;
}) {
  return (
    <div className="prose prose-base md:prose-lg prose-invert max-w-none prose-p:text-gray-200 prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight prose-a:text-accent prose-strong:text-amber-300 prose-code:text-accent prose-code:bg-[#1a1815] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-white/10 prose-ul:my-4 prose-li:my-1 text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled links (including video timestamp links)
          a: ({ href, children, ...props }) => {
            if (href?.startsWith('#t=') && onTimestampClick) {
              const time = parseInt(href.split('=')[1], 10);
              return (
                <button
                  {...(props as ComponentProps<'button'>)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isNaN(time)) onTimestampClick(time);
                  }}
                  className="inline-flex items-center gap-1 text-accent hover:underline font-mono bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-md text-xs font-bold transition-all hover:scale-105 cursor-pointer"
                >
                  ⏱️ {children}
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline hover:text-amber-300 transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },

          // Custom styled blockquotes
          blockquote: ({ children }) => (
            <div className="relative my-6 p-5 sm:p-6 rounded-2xl bg-[#14120f]/90 border border-accent/20 backdrop-blur-md overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent group-hover:bg-amber-400 transition-colors duration-300" />
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-transparent opacity-60 pointer-events-none" />
              <div className="relative z-10 text-gray-200 font-serif italic text-base md:text-lg leading-relaxed flex items-start gap-3">
                <Quote className="w-5 h-5 text-accent shrink-0 mt-1 opacity-70" />
                <div className="flex-1 [&>p]:m-0">{children}</div>
              </div>
            </div>
          ),

          // Custom styling for paragraphs containing Vocab / Quiz / Explain triggers
          p: ({ children }) => {
            const textContent = Array.isArray(children)
              ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
              : typeof children === 'string'
              ? children
              : '';

            // Vocab Card formatting
            if (textContent.includes('Vocab:') || textContent.includes('Def:')) {
              return (
                <div className="my-4 p-4 rounded-xl bg-accent/10 border border-accent/30 backdrop-blur-md shadow-md">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent mb-1.5">
                    <BookOpen className="w-4 h-4" /> Vocabulary Flashcard
                  </div>
                  <div className="text-gray-100 font-sans text-base leading-relaxed">{children}</div>
                </div>
              );
            }

            // Quiz Question formatting
            if (textContent.includes('Quiz:') || textContent.includes('A:')) {
              return (
                <div className="my-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-md">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                    <HelpCircle className="w-4 h-4" /> Multiple Choice Quiz
                  </div>
                  <div className="text-gray-100 font-sans text-base leading-relaxed">{children}</div>
                </div>
              );
            }

            return <p className="mb-4 text-gray-200 leading-relaxed font-sans text-base md:text-lg">{children}</p>;
          },

          // Code blocks
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-[#1a1815] border border-white/10 text-amber-300 font-mono text-xs md:text-sm px-1.5 py-0.5 rounded"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0a0908]">
                <pre className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-gray-300 custom-scrollbar">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {source || '*Start typing or import a PDF/video to see your study notes formatted here...*'}
      </ReactMarkdown>
    </div>
  );
}
