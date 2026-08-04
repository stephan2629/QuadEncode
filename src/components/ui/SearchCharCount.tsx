'use client';

import { useEffect } from 'react';
import { m, transform, useAnimate } from "framer-motion";

// Live character count for the subject search box. There's no real length
// limit on a search query (nothing in the schema or the LLM prompt caps it),
// so this never implies one — it just gives a small, spring-animated nudge
// once the query is long enough that the searcher might want to see it.
const SOFT_THRESHOLD = 40;

export default function SearchCharCount({ length }: { length: number }) {
  const [countRef, animate] = useAnimate();

  const mapLengthToColor = transform([SOFT_THRESHOLD, SOFT_THRESHOLD + 20], ['#6b7280', '#f59e0b']);

  useEffect(() => {
    if (length < SOFT_THRESHOLD) return;

    const mapLengthToSpringVelocity = transform([SOFT_THRESHOLD, SOFT_THRESHOLD + 10], [0, 50]);

    animate(
      countRef.current,
      { scale: 1 },
      {
        type: 'spring',
        velocity: mapLengthToSpringVelocity(length),
        stiffness: 700,
        damping: 80,
      }
    );
  }, [animate, countRef, length]);

  if (length === 0) return null;

  return (
    <m.span
      ref={countRef}
      className="font-mono text-xs flex-shrink-0 px-2"
      style={{ color: mapLengthToColor(length), willChange: 'transform' }}
    >
      {length}
    </m.span>
  );
}
