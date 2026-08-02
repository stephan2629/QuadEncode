// src/lib/motion.ts
import { Variants } from 'framer-motion';

// Checks if the user prefers reduced motion (client-side)
export const getPrefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Returns a duration factoring in reduced motion
export const duration = (ms: number) => {
  return getPrefersReducedMotion() ? 0 : ms / 1000;
};

// 120ms fade with 8px rise
export const promptEnterVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.12,
      ease: 'easeOut'
    }
  },
  exit: { opacity: 0 }
};

// 100ms, 30ms stagger between buttons
export const buttonContainerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03, // 30ms stagger
    }
  }
};

export const buttonItemVariant: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.1, // 100ms
    }
  }
};

// 150ms slide in direction of rating (left/right)
export const getCardExitVariant = (direction: 'left' | 'right' | null): Variants => {
  return {
    hidden: { opacity: 0, x: 0 },
    visible: { opacity: 1, x: 0 },
    exit: { 
      opacity: 0, 
      x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
      transition: {
        duration: 0.15,
        ease: 'easeIn'
      }
    }
  };
};

// 40ms stagger down a list
export const listContainerVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04, // 40ms stagger
    }
  }
};

export const listItemVariant: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 }
};

// Spring physics, quiet, no bounce overshoot
export const progressSpring = {
  type: 'spring',
  stiffness: 200,
  damping: 30, // Higher damping = less bounce
  mass: 1
};
