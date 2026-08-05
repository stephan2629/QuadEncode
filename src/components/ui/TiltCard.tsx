'use client';

import React, { useRef } from 'react';
import { m, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
}

export function TiltCard({ children, className = '', tiltAmount = 10 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`]);

  const shouldReduceMotion = useReducedMotion();

  // Cursor-tracked spotlight: written straight to the DOM via CSS custom
  // properties rather than through React state, since it needs to update on
  // every pixel of mouse movement - a state-driven re-render at that rate
  // would be wasteful when a style write is all this needs.
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current || shouldReduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
    glowRef.current?.style.setProperty('--spotlight-x', `${mouseX}px`);
    glowRef.current?.style.setProperty('--spotlight-y', `${mouseY}px`);
  };

  const handleMouseLeave = () => {
    if (shouldReduceMotion) return;
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: shouldReduceMotion ? 0 : rotateX,
        rotateY: shouldReduceMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative group/tilt ${className}`}
    >
      <div
        style={{ transform: shouldReduceMotion ? 'none' : 'translateZ(30px)' }}
        className="w-full h-full relative"
      >
        {children}
      </div>
      {/* Spotlight: a soft accent glow that follows the cursor across the
          card, fading in only on hover (CSS opacity, not a Framer Motion
          animation - a plain transition, not a loop, gone entirely under
          reduced motion). Sits above content but ignores pointer events so
          it never intercepts clicks. */}
      {!shouldReduceMotion && (
        <div
          ref={glowRef}
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] opacity-0 group-hover/tilt:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(220px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(245,158,11,0.12), transparent 70%)',
          }}
        />
      )}
    </m.div>
  );
}

export default TiltCard;
