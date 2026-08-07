'use client';

import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

// A static blurred glow, not animated - CLAUDE.md section 13 forbids
// "looping, idle, or ambient animation" outright, so there is nothing to
// pause or gate behind prefers-reduced-motion here; the effect simply
// doesn't move. Replaces a @react-three/fiber WebGL canvas (see
// docs/decisions/0009) that ran an unbounded requestAnimationFrame loop on
// every route, including the note editor, for a visually near-identical
// result.
function AmbientGlow() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[-1] pointer-events-none blur-[100px] opacity-70"
      style={{
        backgroundImage:
          'radial-gradient(circle at 70% 30%, #ff4f00 0%, transparent 50%), radial-gradient(circle at 20% 80%, #ffffff 0%, transparent 40%)',
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <AmbientGlow />
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
