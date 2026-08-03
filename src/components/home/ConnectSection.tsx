'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function ConnectSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Respect the user's motion preference: show the final state, animate nothing.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(".scroll-reveal", { opacity: 1, y: 0 });
      return;
    }

    // 1. Text & Form Reveal
    gsap.from(".scroll-reveal", {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 70%",
        toggleActions: "play none none reverse"
      },
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.3,
      ease: "power3.out"
    });

    // 2. Horizontal Scroll Logic
    const track = trackRef.current;
    if (!track) return;

    const items = gsap.utils.toArray(".carousel-item") as HTMLElement[];

    // Calculate the total scrollable distance
    function getScrollAmount() {
      if (!track) return 0;
      const trackWidth = track.scrollWidth;
      return -(trackWidth - window.innerWidth);
    }

    // 3. Dynamic 3D Coverflow Effect, driven by scroll position (not a perpetual ticker)
    function updateCoverflow() {
      const viewportCenter = window.innerWidth / 2;
      items.forEach((item) => {
        // Get position relative to viewport
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        // Calculate distance from center
        const distance = itemCenter - viewportCenter;

        // Logic for the curve:
        // - Max rotation 45deg
        // - Push items back on the Z axis the further away they are
        const maxRotation = 45;
        // Normalizing distance so 1 screen width = 1 max rotation
        let rotation = (distance / (window.innerWidth * 0.5)) * maxRotation;
        // Clamp values so it doesn't spin infinitely
        rotation = Math.max(-maxRotation, Math.min(maxRotation, rotation));

        // Calculate scale and z-depth (chunky elements scaling down gracefully)
        const scale = 1 - Math.abs(distance) / (window.innerWidth * 1.8);
        const clampedScale = Math.max(0.7, scale);
        const z = -Math.abs(distance) * 0.4; // Push back on Z axis

        gsap.set(item, {
          rotationY: rotation,
          scale: clampedScale,
          z: z
        });
      });
    }

    // Pin the section, scroll the track left, and update the coverflow on the same scroll update
    gsap.to(track, {
      x: getScrollAmount,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "center center",
        end: () => `+=${Math.abs(getScrollAmount())}`, // Duration of scroll
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true, // Recalculate on resize
        onUpdate: updateCoverflow,
        onRefresh: updateCoverflow
      }
    });
  }, { scope: sectionRef });

  return (
    <div className="connect-section-wrapper" ref={sectionRef}>
      <div className="spacer">
        <h2 className="title font-serif" style={{ fontSize: '2.5rem' }}>Keep Exploring</h2>
        <p className="subtitle">Swipe through subjects</p>
      </div>

      <section className="connect-section" id="connect-section">
        <div className="scroll-reveal" style={{ textAlign: 'center' }}>
          <p className="subtitle">BROADEN YOUR HORIZONS</p>
          <h2 className="title font-serif">Discover your path</h2>
        </div>

        <div className="carousel-viewport">
          <div className="carousel-track" id="track" ref={trackRef}>
            
            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">AWS Solutions Architect</h3>
                <p className="text-blue-200 z-10 text-sm uppercase tracking-wider font-semibold">Certification</p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">Organic Chemistry</h3>
                <p className="text-emerald-200 z-10 text-sm uppercase tracking-wider font-semibold">Science</p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">Music Theory</h3>
                <p className="text-amber-200 z-10 text-sm uppercase tracking-wider font-semibold">Art</p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-red-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">Learning Spanish</h3>
                <p className="text-rose-200 z-10 text-sm uppercase tracking-wider font-semibold">Language</p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">Project Management</h3>
                <p className="text-indigo-200 z-10 text-sm uppercase tracking-wider font-semibold">Skill</p>
              </div>
            </div>

            <div className="carousel-item">
              <div className="clay-box group relative overflow-hidden flex flex-col justify-end p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 z-0"></div>
                <h3 className="text-3xl font-bold text-white z-10 mb-2 font-serif">AI Tools</h3>
                <p className="text-violet-200 z-10 text-sm uppercase tracking-wider font-semibold">Technology</p>
              </div>
            </div>

          </div>
        </div>
      </section>
      
      <div className="spacer" style={{ height: '50vh' }}></div>
    </div>
  );
}
