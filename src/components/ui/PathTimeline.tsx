'use client';

import { Fragment } from 'react';
import { PlayCircle, FileText, BookOpen } from 'lucide-react';
import { m } from "framer-motion";
import type { PathResource } from '@/app/study/[query]/actions';
import { stepHeading } from '@/lib/certShape';

// A certification's training course comes in exactly two versions of the same
// thing: the free one on YouTube and the paid one on Udemy. They are one step
// with a choice in it, not two steps, so they share a card and the learner
// flips between them. Every other resource (the official overview, each exam
// prep item) is its own card as before, and a flat subject path has no steps
// at all so nothing here changes for it.
export interface TimelineItem {
  heading: string | null;
  options: PathResource[];
}

// Exported so the page can work out what the learner actually picked without
// rebuilding the grouping rule a second way. Pure, so calling it in both
// places costs nothing.
export function buildItems(resources: PathResource[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const [i, resource] of resources.entries()) {
    const previous = resources[i - 1];
    const continuesGroup =
      !!resource.step && resource.step === previous?.step && resource.exam === previous?.exam;

    // Only the course step folds together. Two exam prep resources are both
    // worth doing, so they stay two cards.
    if (continuesGroup && resource.step === 'course') {
      items[items.length - 1].options.push(resource);
      continue;
    }

    items.push({
      heading: resource.step && !continuesGroup ? stepHeading(resource.step, resource.exam) : null,
      options: [resource],
    });
  }

  return items;
}

export default function PathTimeline({
  resources,
  choices = {},
  onChoose,
}: {
  resources: PathResource[];
  // Which version of a multi-option step is showing, by item index. Held by
  // the page rather than by the card, because "Save path" has to save the
  // version the learner chose, not the one that happened to be generated
  // first.
  choices?: Record<number, number>;
  onChoose?: (item: number, option: number) => void;
}) {
  const items = buildItems(resources);

  // One number per step, so the second of two exam prep cards does not read as
  // a fourth step. A flat path sets no step on anything, so every item opens a
  // new number and the count is 1, 2, 3... exactly as before.
  const stepNumbers: number[] = [];
  for (const [i, item] of items.entries()) {
    const opensStep = !!item.heading || !item.options[0].step;
    stepNumbers.push(opensStep ? (stepNumbers[i - 1] ?? 0) + 1 : stepNumbers[i - 1]);
  }

  // One rail down the left, cards to the right of it, at every width. This
  // used to alternate sides on desktop via md:odd:flex-row-reverse, which
  // reads its parity from nth-child - so the step headings sitting between
  // the cards shifted it, and the cards clumped onto one side with tall
  // empty bands opposite them. A path is a sequence read top to bottom
  // anyway; a zigzag makes the eye cross the page for every step and leaves
  // half the row empty whenever two cards differ in height.
  return (
    <div className="relative space-y-5 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-accent before:via-amber-500/30 before:to-transparent">
      {items.map((item, index) => (
        <Fragment key={index}>
          {item.heading && (
            <div className="relative flex items-center gap-3 pt-6 first:pt-0">
              <span data-testid="step-heading" className="ml-14 text-xs font-mono font-bold uppercase tracking-wider text-accent">
                {item.heading}
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          )}
          <PathStep
            item={item}
            stepNumber={stepNumbers[index]}
            index={index}
            choice={choices[index] ?? 0}
            onChoose={onChoose ? (option) => onChoose(index, option) : undefined}
          />
        </Fragment>
      ))}
    </div>
  );
}

function PathStep({
  item,
  stepNumber,
  index,
  choice,
  onChoose,
}: {
  item: TimelineItem;
  stepNumber: number;
  index: number;
  choice: number;
  onChoose?: (option: number) => void;
}) {
  // Free is always first (enforced in generatePath, per CLAUDE.md section 4),
  // so the free version is what a learner sees before touching anything.
  const resource = item.options[choice] ?? item.options[0];

  return (
    <m.div
      className="relative flex items-start gap-4 group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
    >
      {/* Dot, centred on the rail */}
      <div className="mt-5 flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0908] bg-[#14120f] shadow-lg shrink-0 z-10 transition-colors duration-300 group-hover:bg-accent/20 group-hover:border-accent/60 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]">
        {resource.format === 'video' ? <PlayCircle className="w-4 h-4 text-accent" aria-hidden="true" /> : <FileText className="w-4 h-4 text-accent" aria-hidden="true" />}
      </div>

      {/* Content Card */}
      <m.div
        className="flex-1 min-w-0 p-6 rounded-3xl bg-[#14120f]/90 backdrop-blur-md border border-white/10 relative overflow-hidden shadow-xl hover:border-accent/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]"
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Wraps rather than collides: a long cost string ("Free preview, paid
            for full access") used to squeeze the step badge onto two lines and
            overlap it on a phone. */}
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
          <span className="shrink-0 text-[11px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md">
            Step {stepNumber}
          </span>
          {resource.isFree ? (
            <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-0.5 rounded-full font-medium">Free</span>
          ) : (
            <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full font-medium">{resource.cost}</span>
          )}
        </div>

        {/* z-10 because the title's link below stretches over the whole card
            (before:absolute before:inset-0) and would otherwise swallow these
            clicks. Switching versions is instant, no transition: the card
            content is the answer to "what am I about to open". */}
        {item.options.length > 1 && (
          <div
            role="group"
            aria-label="Choose the free or the paid version of this course. Saving the path saves the version you pick."
            className="relative z-10 flex gap-2 mb-4"
          >
            {item.options.map((option, i) => (
              <button
                key={option.url + i}
                type="button"
                onClick={() => onChoose?.(i)}
                aria-pressed={choice === i}
                className={`min-h-[44px] px-4 text-xs font-mono font-bold uppercase tracking-wider rounded-lg border transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  choice === i
                    ? 'bg-accent/15 border-accent/50 text-accent'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'
                }`}
              >
                {option.isFree ? 'Free' : 'Paid'}
              </button>
            ))}
          </div>
        )}

        <h3 className="text-lg md:text-xl font-bold font-serif text-white mb-2 leading-snug group-hover:text-accent transition-colors">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
            {resource.title}
          </a>
        </h3>

        {/* 16px, not 14: this description is the actual reading content of the
            page (what the resource covers and who it suits), and the audit
            checklist puts the floor for body text on mobile at 16px.
            max-w-prose keeps the line length near 65 characters now that the
            card runs the full width. */}
        <div className="text-base text-gray-400 mb-4 leading-relaxed max-w-prose">
          {resource.description}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-gray-300">
            <BookOpen className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            {resource.provider}
          </span>
        </div>
      </m.div>
    </m.div>
  );
}
