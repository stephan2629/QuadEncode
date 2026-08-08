'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PenTool, BrainCircuit, RefreshCw, FileText, FileDown, Image as ImageIcon, Video, MoveRight, Search, Eye, Loader2 } from 'lucide-react';
import { m } from "framer-motion";
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import SearchCharCount from '@/components/ui/SearchCharCount';
import Footer from '@/components/ui/Footer';
import AccountMenu from '@/components/ui/AccountMenu';
import { logout } from '@/app/login/actions';

const SubjectWall = dynamic(() => import('@/components/ui/SubjectWall'), { ssr: false });
const TiltCard = dynamic(() => import('@/components/ui/TiltCard'), { ssr: false });
const FlipCardDemo = dynamic(() => import('@/components/ui/FlipCardDemo'), { ssr: false });
const MarkdownToRecallDemo = dynamic(() => import('@/components/ui/MarkdownToRecallDemo'), { ssr: false });
const ContainerScrollAnimation = dynamic(() => import('@/components/ui/ContainerScrollAnimation').then(mod => mod.ContainerScrollAnimation), { ssr: false });

const SEARCH_EXAMPLES = [
  "CompTIA Security+",
  "Spanish Vocab",
  "Music Theory",
  "AWS Solutions Architect",
  "Organic Chemistry",
  "Python Programming",
  "Guitar Chords",
  "Machine Learning"
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [heroFlipped, setHeroFlipped] = useState(false);

  // Animated Typewriter State for Search Bar Placeholder
  const [placeholderText, setPlaceholderText] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Typewriter effect loop. While focused or typed-into, the input shows a
  // fixed string instead - computed at render time below rather than pushed
  // into state here, so the effect only ever touches state from its own
  // async setTimeout callback, never synchronously in the effect body.
  useEffect(() => {
    if (isFocused || searchQuery) return;

    const currentTopic = SEARCH_EXAMPLES[exampleIndex];
    const targetText = `Try "${currentTopic}"...`;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setPlaceholderText(targetText.slice(0, placeholderText.length + 1));
        if (placeholderText.length + 1 >= targetText.length) {
          setTimeout(() => setIsDeleting(true), 2200);
        }
      } else {
        setPlaceholderText(targetText.slice(0, placeholderText.length - 1));
        if (placeholderText.length - 1 <= 0) {
          setIsDeleting(false);
          setExampleIndex((prev) => (prev + 1) % SEARCH_EXAMPLES.length);
        }
      }
    }, isDeleting ? 35 : 75);

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, exampleIndex, isFocused, searchQuery]);

  // Drives the sticky nav's compact/blurred state. Plain scroll listener
  // rather than Framer's useScroll: this only needs one boolean threshold,
  // not a continuous motion value, and a passive listener costs less than
  // a subscription that re-renders on every frame of scroll.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Clears local user state and signs out on the client immediately so the
  // header reverts to "Sign in" before any server round-trip completes.
  // The server action runs concurrently (not awaited) and its redirect
  // navigates the page away once the server-side session is also cleared.
  const handleLogout = () => {
    setUser(null);
    const supabase = createClient();
    supabase.auth.signOut().then(() => logout());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isSearching) {
      setIsSearching(true);
      // "+" becomes "plus" instead of being stripped: it is part of the
      // official name of most CompTIA exams, and dropping it turned
      // "CompTIA Security+" into "comptia-security" and "A+ certification"
      // into "a-certification", which no longer says which exam it is.
      // detectCertification reads "plus" back as "+" (src/lib/certShape.ts).
      const slug = searchQuery
        .trim()
        .toLowerCase()
        .replace(/\+/g, ' plus ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      router.push(`/study/${slug}`);
    }
  };

  const features = [
    {
      n: '01',
      icon: BrainCircuit,
      title: "Retrieval beats rereading",
      description: "Rereading feels fluent and predicts almost nothing. Producing the answer from memory is what leaves a trace.",
      citation: "Roediger & Karpicke, 2006",
    },
    {
      n: '02',
      icon: RefreshCw,
      title: "Spacing beats massing",
      description: "The same minutes spread across days outperform the same minutes in one sitting, and the advantage grows with the delay.",
      citation: "Cepeda et al., 2006",
    },
    {
      n: '03',
      icon: PenTool,
      title: "Generation beats provision",
      description: "A word you generate is remembered better than the same word handed to you. Write the answer yourself and it stays; the cards you author count toward progress, the imported ones do not until you re-explain them.",
      citation: null,
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
      body: 'The prompt comes up on its own. Answer it in your head, then reveal, which happens instantly so nothing lets your eye skim ahead. Rate yourself honestly. What you keep missing comes back sooner; what has stuck moves out of the way, and a card you fail three times writes itself back into your note to re-explain.',
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
    <div className="relative min-h-screen bg-[#14120f] overflow-hidden selection:bg-accent/30 text-white font-sans">

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

      {/* Navbar. Sticky rather than absolute: it used to scroll away with
          the hero, which left a signed-in visitor no route back to their
          own work until the very bottom of a long page. Keeping it pinned
          means the account menu (Go to dashboard / Settings / Log out) is
          reachable from anywhere on the page. Padding tightens once stuck
          so it takes less of the viewport while scrolling, and the
          backdrop blur only appears then, so it stays invisible over the
          hero. */}
      <m.nav
        className={`fixed top-0 w-full flex justify-between items-center z-50 transition-[padding,background-color,border-color] duration-300 border-b ${
          scrolled
            ? 'py-3 px-4 md:px-10 bg-[#14120f]/80 backdrop-blur-xl border-white/10'
            : 'p-4 md:p-10 bg-transparent border-transparent'
        }`}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Quad Encode Logo" width={28} height={28} className="w-5 h-5 md:w-7 md:h-7" />
          <span className="font-serif font-bold text-lg md:text-xl tracking-tight">Quad Encode</span>
        </div>

        {user ? (
          // The same dropdown the app's own header uses, rather than a
          // second bespoke one: a signed-in visitor on the landing page
          // gets the same Dashboard / Settings / Log out routes they'd have
          // anywhere else, instead of a chip that only goes one place.
          <AccountMenu
            email={user.email ?? ''}
            name={user.user_metadata?.name || user.user_metadata?.full_name || null}
            avatarUrl={user.user_metadata?.avatar_url ?? null}
            showDashboardLink
            onLogout={handleLogout}
          />
        ) : (
          // Straight to /login, not /dashboard - the proxy would bounce a
          // signed-out visitor there anyway, so this skips a redirect.
          <Link
            href="/login"
            className="text-xs md:text-sm font-semibold text-accent hover:text-[#0a0908] bg-[#14120f] hover:bg-gradient-to-b hover:from-accent hover:to-yellow-600 border border-white/10 hover:border-accent/0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(245,158,11,0.3)] px-4 md:px-6 py-2 md:py-2.5 rounded-full transition-[color,background-color,border-color,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 inline-block active:scale-95"
          >
            Sign in
          </Link>
        )}
      </m.nav>

      {/* Main Hero Section */}
      <main className="relative pt-32 md:pt-44 pb-16 md:pb-24 px-4 md:px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Ambient Hero Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-amber-500/15 via-accent/10 to-amber-600/15 blur-[140px] rounded-full pointer-events-none -z-10" />

        {/* Kicker Badge */}
        <m.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-wider mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md"
        >
          {/* No animate-pulse on the icon: section 13 forbids looping and
              idle animation outright, and a badge that throbs forever is
              exactly that. */}
          <BrainCircuit className="w-4 h-4 text-accent" aria-hidden="true" /> The AI active recall workspace
        </m.div>

        {/* Hero Copy (Massive Typography). Plain h1, not m.h1: this is the
            page's LCP element, and animating its opacity in delayed LCP by
            ~1.1s (Framer Motion has to hydrate and run the fade before the
            text counts as painted). Everything below the fold still gets
            the entrance motion; the headline just renders immediately. */}
        <h1 className="text-[clamp(2.5rem,6vw,80px)] font-bold tracking-tighter mb-6 md:mb-8 font-serif leading-[1.1] md:leading-[1.03] text-white">
          Outsmart your own brain. <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-yellow-400 to-amber-500">Study without the boredom.</span>
        </h1>

        {/* Plain p, not m.p: same LCP reasoning as the h1 above — this is
            the next-largest text block and was becoming the LCP element
            once the headline stopped blocking on it. */}
        <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-10 md:mb-14 max-w-2xl mx-auto font-light px-4 leading-relaxed tracking-wide">
          Turn notes and imported files into cards that test you, and web topics into curated learning paths.
        </p>

        {/* Search Bar Component */}
        <m.div
          className="relative w-full max-w-2xl z-40 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <form
            onSubmit={handleSearch}
            className={`w-full relative transition-[border-color,box-shadow] duration-500 rounded-2xl overflow-hidden bg-[#14120f]/90 backdrop-blur-2xl border ${isFocused ? 'border-accent shadow-[0_0_0_2px_#f59e0b,0_0_40px_rgba(245,158,11,0.3)]' : 'border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.6)] hover:border-accent/50'}`}
          >
            <div className="flex items-center px-2 py-2">
              <input
                ref={searchInputRef}
                type="text"
                id="subject-search"
                name="subject"
                maxLength={80}
                // The placeholder rotates through examples, so it can't be the
                // accessible name for this field.
                aria-label="What do you want to learn?"
                className="w-full bg-transparent border-none outline-none text-white text-base md:text-lg px-4 md:px-5 placeholder-gray-400 font-medium"
                placeholder={isFocused || searchQuery ? "What do you want to learn?" : (placeholderText || "What do you want to learn?")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              />
              <SearchCharCount length={searchQuery.length} />
              <button type="submit" disabled={isSearching} className="hidden md:flex flex-shrink-0 items-center gap-2 text-sm font-bold text-[#0a0908] bg-gradient-to-r from-accent to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110 px-6 py-3.5 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 cursor-pointer active:scale-95 disabled:opacity-70">
                {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Curating path…</> : <>Find path <MoveRight className="w-4 h-4" aria-hidden="true" /></>}
              </button>
            </div>
          </form>
          <button onClick={handleSearch} disabled={isSearching} className="md:hidden mt-4 flex items-center gap-2 text-sm font-bold text-[#0a0908] bg-gradient-to-r from-accent to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:brightness-110 px-8 py-3.5 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 cursor-pointer active:scale-95 w-full justify-center disabled:opacity-70">
            {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Curating path…</> : <>Find path <MoveRight className="w-4 h-4" aria-hidden="true" /></>}
          </button>

          {/* Example Chips */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
              <span>Try typing any subject, certification, or skill:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {[
                'CompTIA Security+',
                'Spanish Vocab',
                'Music Theory',
                'AWS Solutions Architect',
                'Organic Chemistry',
                'Python Programming',
                'Guitar Chords'
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSearchQuery(chip)}
                  className="px-3.5 py-3 sm:py-1.5 min-h-[44px] text-xs bg-white/5 hover:bg-accent/20 text-gray-300 hover:text-accent border border-white/10 hover:border-accent/50 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 font-medium active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

        </m.div>

        {/* Both routes into the app, side by side and the same size, because
            leading with the search box alone implied path finding was the
            product. Someone taking notes for a class should not have to
            search for a path first. Reuses the TiltCard + stagger tokens the
            rest of the page already uses, so this is an information
            architecture change rather than a new surface. */}
        <m.div
          className="w-full max-w-3xl mx-auto mt-16 md:mt-20 text-left"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-center text-2xl md:text-3xl font-serif font-bold text-white mb-3 tracking-tight">
            Two ways in
          </h2>
          <p className="text-center text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-8">
            Which one you want depends on whether you already have something to study. Both end in the
            same place, with cards that ask you the question.
          </p>
          <m.div
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <m.div variants={fadeUpItem}>
              <TiltCard tiltAmount={4} className="group bg-[#14120f]/60 backdrop-blur-md border border-accent/25 hover:border-accent/50 rounded-3xl p-7 h-full flex flex-col transition-colors">
                <div className="bg-accent/10 w-11 h-11 rounded-2xl flex items-center justify-center text-accent mb-5">
                  <Search className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent mb-2">
                  You have nothing yet
                </p>
                <h3 className="text-xl font-bold font-serif mb-2 text-white">Find a path</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-1">
                  Type in a subject and get its resources put in an order, free ones first, each with a
                  plain description of what it covers. No account needed to look.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    searchInputRef.current?.focus();
                  }}
                  className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1.5 min-h-[44px] self-start cursor-pointer"
                >
                  Search a subject <MoveRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </TiltCard>
            </m.div>
            <m.div variants={fadeUpItem}>
              <TiltCard tiltAmount={4} className="group bg-[#14120f]/60 backdrop-blur-md border border-blue-400/25 hover:border-blue-400/50 rounded-3xl p-7 h-full flex flex-col transition-colors">
                <div className="bg-blue-400/10 w-11 h-11 rounded-2xl flex items-center justify-center text-blue-400 mb-5">
                  <PenTool className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 mb-2">
                  You have a class, a book, or notes
                </p>
                <h3 className="text-xl font-bold font-serif mb-2 text-white">Just start studying</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5 flex-1">
                  Skip the search. Open a note and write, paste, or upload what you are studying, and the
                  <span className="font-mono text-blue-400"> **Vocab:** </span>
                  lines in it become cards.
                </p>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  className="text-sm font-semibold text-blue-400 hover:text-blue-400/80 transition-colors inline-flex items-center gap-1.5 min-h-[44px] self-start"
                >
                  Open a note <MoveRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </TiltCard>
            </m.div>
          </m.div>
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
            <m.button
              type="button"
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
                className="absolute inset-0 bg-[#14120f] border-2 border-white/10 hover:border-white/20 transition-colors p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-lg font-serif leading-relaxed text-white">What is the core philosophy of Quad Encode?</p>
                {!heroFlipped && (
                  <p className="absolute bottom-4 text-[11px] text-gray-400 font-mono tracking-widest uppercase">Tap, Enter, or Space to reveal</p>
                )}
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 bg-[#14120f] border-2 border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-base text-gray-300 leading-relaxed font-serif">Never see an answer you didn&apos;t try to retrieve yourself.</p>
              </div>
            </m.button>
          </div>
        </m.div>

        {/* 21st.dev Inspired Scroll-Driven Container Reveal */}
        <ContainerScrollAnimation />

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
          {/* Evidence cards, not feature cards: each claim is a citation, so
              the citation gets its own footer treatment (a mono reference
              tag below a rule) instead of being buried in the paragraph.
              Equal-width columns, deliberately distinct from the numbered
              icon cards in "How it works" just below - same TiltCard/rounded-3xl
              tokens, different rhythm, so the two sections don't blur together. */}
          <m.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature) => (
              <m.div key={feature.n} variants={fadeUpItem}>
                <TiltCard tiltAmount={4} className="relative group bg-[#14120f]/60 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl p-8 transition-colors overflow-hidden h-full flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="flex items-center justify-between mb-6 transform-gpu translate-z-10">
                    <div className="bg-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <feature.icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-sm text-gray-500">{feature.n}</span>
                  </div>
                  <h3 className="text-2xl font-bold font-serif mb-3 text-white transform-gpu translate-z-10">{feature.title}</h3>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed transform-gpu translate-z-10 flex-1">
                    {feature.description}
                  </p>
                  {feature.citation && (
                    <div className="mt-6 pt-4 border-t border-white/5 transform-gpu translate-z-10">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
                        {feature.citation}
                      </span>
                    </div>
                  )}
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
                    {step.cta} <MoveRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" aria-hidden="true" />
                  </Link>
                </TiltCard>
              </m.div>
            ))}
          </m.div>

          <div className="mt-16 w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 relative h-64 md:h-96">
            <div className="absolute inset-0 bg-gradient-to-t from-[#14120f] via-transparent to-transparent z-10"></div>
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
          className="mt-24 md:mt-32 w-full max-w-3xl mx-auto text-center relative"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Ambient Glow behind Manifesto */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-gradient-to-r from-amber-500/10 via-accent/5 to-amber-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />

          <p className="text-2xl md:text-4xl font-serif font-bold text-white leading-tight mb-8">
            Reading feels productive. <br className="hidden md:block" />It is the cheapest thing you can do <br className="hidden md:block" />with an hour.
          </p>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto font-light">
            Every other tool will happily show you the answer. That is the moment the work stops. Quad Encode puts the prompt up on its own and waits, and the answer it shows you is the one you wrote when you understood it, not a stranger&apos;s.
          </p>

          <div className="mt-16 md:mt-24 flex flex-col md:flex-row flex-wrap items-center justify-center gap-8 perspective-1000">
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
            <FlipCardDemo
              kind="Organic Chemistry"
              prompt="What functional group defines an alcohol?"
              answer="Hydroxyl (-OH)"
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
                      <method.icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold font-serif mb-3 text-white transform-gpu translate-z-10">{method.title}</h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed transform-gpu translate-z-10">{method.body}</p>
                  </TiltCard>
                </m.div>
              );
            })}
          </m.div>
        </m.div>

        {/* Closing call to action. "Free" is a plain fact here, not a
            promotion: there is no paid tier and nothing asks for a card
            (CLAUDE.md's phase list keeps paid tiers explicitly out of
            scope). No claim about how fast a path generates - the first
            search for a new subject runs a real pipeline and takes about
            20 seconds, so "in seconds" would be a promise the product
            doesn't keep. Deliberately worded differently from the
            mid-page CTA in ContainerScrollAnimation so the two read as
            separate moments rather than the same block twice. */}
        <m.div
          className="mt-24 md:mt-32 w-full text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
            Start with one card
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8 font-light leading-relaxed">
            Free to use, and nothing here asks for a card. Search a subject to see a path, or write a note and watch one line of it become something that tests you.
          </p>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 text-sm md:text-base font-bold text-[#0a0908] bg-gradient-to-r from-accent to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:brightness-110 px-8 py-4 min-h-[44px] rounded-xl transition-[filter,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 active:scale-95"
          >
            {user ? 'Go to your dashboard' : 'Get started free'}
            <MoveRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </m.div>

      </main>

      <Footer />
    </div>
  );
}
