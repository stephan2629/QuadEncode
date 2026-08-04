'use client';

import dynamic from "next/dynamic";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

// next/dynamic's ssr:false option only works from a Client Component -
// layout.tsx is a Server Component, so the code-split import lives here
// instead, the nearest client boundary.
const ThreeBackground = dynamic(
  () => import("@/components/ui/ThreeBackground").then((mod) => mod.ThreeBackground),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <ThreeBackground />
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
