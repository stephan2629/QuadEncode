'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="prose prose-sm md:prose-base prose-invert prose-amber max-w-none prose-p:leading-relaxed prose-headings:text-white prose-a:text-accent">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          blockquote: ({ children }) => (
            <div className="relative my-8 p-6 rounded-2xl bg-[#14120f] border border-white/10 backdrop-blur-md overflow-hidden group shadow-lg">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent/80 group-hover:bg-accent transition-colors duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 text-gray-200 m-0 [&>p]:m-0 [&>p]:mb-2 last:[&>p]:mb-0">
                {children}
              </div>
            </div>
          )
        }}
      >
        {source || '*Preview will appear here*'}
      </ReactMarkdown>
    </div>
  );
}
