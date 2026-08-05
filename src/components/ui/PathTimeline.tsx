'use client';

import { Fragment } from 'react';
import { PlayCircle, FileText, BookOpen } from 'lucide-react';
import { m } from "framer-motion";
import type { PathResource } from '@/app/study/[query]/actions';

export default function PathTimeline({ resources }: { resources: PathResource[] }) {
  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-accent before:via-amber-500/30 before:to-transparent">
      {resources.map((resource, index) => {
        // Certification paths carry a "stage" per resource (see
        // study/[query]/actions.ts); a normal path never sets it, so this
        // never renders and the timeline stays exactly as it was. Derived
        // from the array itself (not a mutated closure variable) so render
        // stays pure.
        const showStageHeader = !!resource.stage && resource.stage !== resources[index - 1]?.stage;

        return (
          <Fragment key={index}>
            {showStageHeader && (
              <div className="relative flex items-center gap-4 py-2 md:justify-center">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent bg-[#0a0908] pr-3 md:px-3 relative z-10">
                  {resource.stage}
                </span>
                <span className="hidden md:block h-px flex-1 bg-white/10 max-w-24" />
              </div>
            )}
            <m.div
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            >
              {/* Timeline dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0908] bg-[#14120f] shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-300 group-hover:bg-accent/20 group-hover:border-accent/60 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                {resource.format === 'video' ? <PlayCircle className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-accent" />}
              </div>

              {/* Content Card */}
              <m.div
                className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-[#14120f]/90 backdrop-blur-md border border-white/10 relative overflow-hidden cursor-pointer shadow-xl hover:border-accent/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]"
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md">
                    Step {index + 1}
                  </span>
                  {resource.isFree ? (
                    <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-0.5 rounded-full font-medium">Free</span>
                  ) : (
                    <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full font-medium">{resource.cost}</span>
                  )}
                </div>

                <h3 className="text-lg font-bold font-serif text-white mb-2 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
                    {resource.title}
                  </a>
                </h3>

                <div className="text-xs text-gray-400 mb-4 line-clamp-3 leading-relaxed font-light">
                  {resource.description}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-gray-300">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    {resource.provider}
                  </span>
                </div>
              </m.div>
            </m.div>
          </Fragment>
        );
      })}
    </div>
  );
}
