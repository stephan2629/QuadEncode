'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PenTool, BrainCircuit, RefreshCw, FileText, FileDown, Image as ImageIcon, Video, MoveRight, Search, Eye } from 'lucide-react';
import { m } from "framer-motion";
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import SearchCharCount from '@/components/ui/SearchCharCount';

const SubjectWall = dynamic(() => import('@/components/ui/SubjectWall'), { ssr: false });
const TiltCard = dynamic(() => import('@/components/ui/TiltCard'), { ssr: false });
const FlipCardDemo = dynamic(() => import('@/components/ui/FlipCardDemo'), { ssr: false });
const MarkdownToRecallDemo = dynamic(() => import('@/components/ui/MarkdownToRecallDemo'), { ssr: false });

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [heroFlipped, setHeroFlipped] = useState(false);

  const router = useRouter();
  
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    if (window.matchMedia('(pointer: fine)').matches) {
      searchInputRef.current?.focus();
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const slug = searchQuery.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      router.push(`/study/${slug}`);
    }
  };

  const features = [
    {
      icon: BrainCircuit,
      title: "Retrieval beats rereading",
      description: "Rereading feels fluent and predicts almost nothing. Producing the answer from memory is what leaves a trace. Roediger & Karpicke, 2006."
    },
    {
      icon: RefreshCw,
      title: "Spacing beats massing",
      description: "The same minutes spread across days outperform the same minutes in one sitting, and the advantage grows with the delay. Cepeda et al., 2006."
    },
    {
      icon: PenTool,
      title: "Generation beats provision",
      description: "A word you generate is remembered better than the same word handed to you. Which is why the app will not write your answers."
    }
  ];

  const loopSteps = [
    {
      n: '01',
      icon: Search,
      title: 'Find the material',
      body: 'Type in the subject. Quad Encode ranks the strongest material on the open web and orders it into a path. Free resources come first, each with a plain description of what it covers and who it is actually for.',
      cta: 'See a real path',
      href: '/study/spanish',
    },
    {
      n: '02',
      icon: PenTool,
      title: 'Write it down as prompts',
      body: 'Take notes in the editor, or bring in notes you already have. Write **Vocab:** and **Def:** around a term and it becomes a flip card. Nothing else to learn.',
      cta: 'Try the editor',
      href: '/dashboard',
    },
    {
      n: '03',
      icon: Eye,
      title: 'Answer before you are told',
      body: 'Review is a blank field, not a flashcard back. You write the answer, then compare it with the one you wrote when you understood it. What you keep missing returns sooner; what has stuck moves out of the way.',
      cta: 'Run a session',
      href: '/dashboard',
    },
  ];

  const importMethods = [
    {
      icon: FileText,
      title: 'Paste',
      body: 'Markdown, a wall of text, or a page out of a doc. Headings become sections; your **Vocab:** lines are picked up on arrival.',
    },
    {
      icon: FileDown,
      title: 'PDF',
      body: 'Lecture slides, a textbook chapter, an exam guide. Page numbers are kept, so the jump-back lands on the page you read it on.',
    },
    {
      icon: ImageIcon,
      title: 'Screenshot',
      body: 'A slide, a diagram, a paused video frame. The text is read out of the image and the frame stays attached to the note.',
    },
    {
      icon: Video,
      title: 'Video',
      body: 'Write a note while a video plays and the timestamp is stored with it. Blank on the prompt later and you land on the second it was explained.',
    },
  ];



  // Reveal-on-scroll: children stagger in as a group enters the viewport.
  // Every motion the landing page does is either this (scroll caused it) or
  // hover/tap feedback — never a free-running loop, per CLAUDE.md section 11.
  const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const fadeUpItem = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' as const } },
  };

  return (
    <div className="relative min-h-screen bg-[#0a0908] overflow-hidden selection:bg-accent/30 text-white font-sans">
      
      {/* Uiverse-Style Dotted Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none -z-20 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-70"></div>

      {/* Background Orbs */}
      <m.div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
      </m.div>

      {/* Subject wall: the app's own material, tilted into a 3D drift tied to scroll position */}
      <m.div
        className="hidden lg:block absolute top-24 right-[-160px] -z-10 opacity-40 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        <SubjectWall />
      </m.div>

      {/* Navbar */}
      <m.nav
        className="absolute top-0 w-full p-4 md:p-10 flex justify-between items-center z-50"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Quad Encode Logo" width={28} height={28} className="w-5 h-5 md:w-7 md:h-7" />
          <span className="font-serif font-bold text-lg md:text-xl tracking-tight">Quad Encode</span>
        </div>

        {user ? (
          <Link href="/dashboard" className="flex items-center gap-3 group bg-white/5 hover:bg-white/10 px-3 py-1.5 md:py-2 rounded-full border border-white/10 transition-colors">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-accent/20 border border-accent overflow-hidden flex items-center justify-center">
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-accent text-xs md:text-sm font-bold">{user.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors hidden md:block">
              {user.user_metadata?.name || 'Dashboard'}
            </span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="text-xs md:text-sm font-semibold text-accent hover:text-[#0a0908] bg-[#14120f] hover:bg-gradient-to-b hover:from-accent hover:to-yellow-600 border border-white/10 hover:border-accent/0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(245,158,11,0.3)] px-4 md:px-6 py-2 md:py-2.5 rounded-full transition-all duration-300 inline-block active:scale-95"
          >
            Sign In
          </Link>
        )}
      </m.nav>

      {/* Main Hero Section */}
      <main className="relative pt-32 md:pt-48 pb-16 md:pb-24 px-4 md:px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Hero Copy (Massive Typography) */}
        <m.h1
          className="text-[clamp(2.2rem,7vw,90px)] font-bold tracking-tighter mb-6 md:mb-8 font-serif leading-[1.12] md:leading-[1.05] text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Never see an answer you <br className="hidden md:block"/>
          didn&apos;t try to <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-yellow-400 to-accent">retrieve yourself.</span>
        </m.h1>

        <m.p
          className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 md:mb-16 max-w-3xl mx-auto font-light px-4 leading-relaxed tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Search a topic to build a learning path, take notes, and turn them into recall prompts.
        </m.p>

        {/* Search Bar Component */}
        <m.div 
          className="relative w-full max-w-2xl z-40 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3 font-mono">Start here</div>
          <form 
            onSubmit={handleSearch}
            className={`w-full relative transition-all duration-500 rounded-2xl overflow-hidden bg-[#14120f]/80 backdrop-blur-xl ${isFocused ? 'shadow-[0_0_0_2px_#f59e0b,0_0_40px_rgba(245,158,11,0.3)]' : 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_0_1px_rgba(245,158,11,0.5)]'}`}
          >
            <div className="flex items-center px-2 py-2">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent border-none outline-none text-white text-base md:text-lg px-4 md:px-5 placeholder-gray-500 font-medium"
                placeholder="What do you want to learn?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              />
              <SearchCharCount length={searchQuery.length} />
              <button type="submit" className="hidden md:flex flex-shrink-0 items-center gap-2 text-sm font-bold text-[#0a0908] bg-gradient-to-b from-accent to-yellow-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(245,158,11,0.3)] hover:brightness-110 px-6 py-3 rounded-xl transition-all cursor-pointer active:scale-95">
                Find the path <MoveRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          <button onClick={handleSearch} className="md:hidden mt-4 flex items-center gap-2 text-sm font-bold text-[#0a0908] bg-gradient-to-b from-accent to-yellow-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(245,158,11,0.3)] hover:brightness-110 px-8 py-3.5 rounded-xl transition-all cursor-pointer active:scale-95 w-full justify-center">
            Find the path <MoveRight className="w-4 h-4" />
          </button>

          {/* Example Chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <span className="text-sm text-gray-500 mr-2 self-center">Try:</span>
            {['CompTIA Security+', 'Spanish Vocab', 'Music Theory'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setSearchQuery(chip)}
                className="px-3 py-1 text-sm bg-white/5 hover:bg-accent/20 text-gray-300 hover:text-accent border border-white/10 hover:border-accent/50 rounded-full transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </m.div>

        {/* Live Interactive Demo Widget - same colors, border, typography, and
            zero-duration flip as the real vocab card in ReviewSession.tsx, so
            this is a preview of the actual mechanic, not a lookalike. */}
        <m.div
          className="w-full relative z-30 mt-16 max-w-md mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-xs font-bold text-accent uppercase tracking-wider mb-4 text-left">Try it instantly</div>
          <div className="relative h-40" style={{ perspective: '1000px' }}>
            <m.div
              role="button"
              tabIndex={0}
              aria-label={heroFlipped ? 'Answer revealed. Press to flip back.' : 'Show answer'}
              aria-pressed={heroFlipped}
              className="w-full h-full relative cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 rounded-3xl"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: heroFlipped ? 180 : 0 }}
              transition={{ rotateY: { duration: 0 } }}
              onClick={() => setHeroFlipped((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHeroFlipped((f) => !f);
                }
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-[#0a0908] border-2 border-white/10 hover:border-white/20 transition-colors p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-lg font-serif leading-relaxed text-white">What is the core philosophy of Quad Encode?</p>
                {!heroFlipped && (
                  <p className="absolute bottom-4 text-[10px] text-gray-400 font-mono tracking-widest uppercase">Tap to reveal</p>
                )}
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 bg-[#14120f] border-2 border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-base text-gray-300 leading-relaxed font-serif">Never see an answer you didn&apos;t try to retrieve yourself.</p>
              </div>
            </m.div>
          </div>
        </m.div>

        {/* Markdown-to-recall preview: the actual mechanic, not a screenshot of it */}
        <m.div
          className="w-full max-w-4xl mx-auto relative z-30 mt-20 md:mt-28 text-left"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 tracking-tight">One line becomes a card</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Write <span className="font-mono text-accent">**Vocab:**</span> and <span className="font-mono text-blue-400">**Def:**</span> around a term in your notes. Try the card on the right yourself.
            </p>
          </div>
          <MarkdownToRecallDemo />
        </m.div>

        {/* Feature Grid (Bento) */}
        <m.div
          className="mt-24 md:mt-32 w-full text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-12 md:mb-20 tracking-tight">Why it is built this way</h2>
          <m.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
          {features.map((feature, idx) => (
            <m.div key={idx} variants={fadeUpItem} className={idx === 0 ? "md:col-span-2 md:row-span-2" : "col-span-1"}>
              <TiltCard tiltAmount={4} className="relative group bg-[#14120f]/60 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl p-8 md:p-10 transition-colors overflow-hidden h-full flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="bg-accent/10 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-accent mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <feature.icon className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-serif mb-4 text-white transform-gpu translate-z-10">{feature.title}</h3>
                <p className="text-gray-400 text-sm md:text-lg leading-relaxed transform-gpu translate-z-10 font-light">
                  {feature.description}
                </p>
              </TiltCard>
            </m.div>
          ))}
          </m.div>
        </m.div>

        {/* The Loop */}
        <m.div
          className="mt-24 md:mt-32 w-full text-left"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-10 md:mb-16 text-center tracking-tight">How it works</h2>
          <m.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {loopSteps.map((step) => (
              <m.div key={step.n} variants={fadeUpItem}>
                <TiltCard tiltAmount={4} className="group relative bg-[#14120f]/60 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl p-8 h-full flex flex-col transition-colors overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <step.icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-sm text-gray-500">{step.n}</span>
                  </div>
                  <h3 className="text-xl font-bold font-serif mb-3 text-white transform-gpu translate-z-10">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1 transform-gpu translate-z-10">{step.body}</p>
                  <Link href={step.href} className="group/cta text-sm font-semibold text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1.5 transform-gpu translate-z-10">
                    {step.cta} <MoveRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" />
                  </Link>
                </TiltCard>
              </m.div>
            ))}
          </m.div>
          
          <div className="mt-16 w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 relative h-64 md:h-96">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-transparent to-transparent z-10"></div>
            <Image
              src="/study-notes.png"
              alt="Handwritten study notes alongside a tablet"
              fill
              sizes="(min-width: 768px) 896px, 100vw"
              className="object-cover opacity-70"
            />
          </div>
        </m.div>

        {/* Manifesto statement */}
        <m.div
          className="mt-24 md:mt-32 w-full max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-2xl md:text-4xl font-serif font-bold text-white leading-tight mb-8">
            Reading feels productive. <br className="hidden md:block" />It is the cheapest thing you can do <br className="hidden md:block" />with an hour.
          </p>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            Every other tool will happily show you the answer. That is the moment the work stops. Quad Encode holds the answer back until you have produced one, and then shows you your own words, not a stranger&apos;s.
          </p>

          <div className="mt-16 md:mt-24 flex flex-col md:flex-row flex-wrap justify-center gap-8 perspective-1000">
            <FlipCardDemo 
              kind="Music Theory" 
              prompt="What is the relative minor of G major?"
              answer="E minor"
            />
            <FlipCardDemo 
              kind="Computer Science" 
              prompt="What is the time complexity of binary search?"
              answer="O(log n)"
            />
            <FlipCardDemo 
              kind="Spanish" 
              prompt="Translate: 'To develop'"
              answer="Desarrollar"
            />
          </div>
        </m.div>

        {/* Bring what you have */}
        <m.div
          className="mt-24 md:mt-32 w-full text-left"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight">Bring what you have</h2>
            <p className="text-gray-400 text-lg">Four apps of notes, one import</p>
            <p className="text-gray-400 text-base max-w-2xl mx-auto mt-4 font-light">
              Paste text, upload a PDF, or drop in a screenshot of a slide or a whiteboard. Quad Encode keeps the source alongside the note, so a prompt can always take you back to where it came from.
            </p>
          </div>

          <m.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {importMethods.map((method, idx) => {
              // Bento styling: first and last items span 2 columns, middle two span 1 column
              const isLarge = idx === 0 || idx === 3;
              return (
                <m.div key={method.title} variants={fadeUpItem} className={isLarge ? "md:col-span-2" : "col-span-1"}>
                  <TiltCard tiltAmount={isLarge ? 3 : 5} className="group bg-[#14120f]/60 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl p-8 md:p-10 h-full transition-colors flex flex-col justify-center">
                    <div className="bg-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center text-accent mb-6 transition-transform duration-500 group-hover:scale-110 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <method.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold font-serif mb-3 text-white transform-gpu translate-z-10">{method.title}</h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed transform-gpu translate-z-10 font-light">{method.body}</p>
                  </TiltCard>
                </m.div>
              );
            })}
          </m.div>
        </m.div>



      </main>
    </div>
  );
}
