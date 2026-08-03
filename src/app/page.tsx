'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, BrainCircuit, PenTool, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);

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
      icon: Search,
      title: "Discover Paths",
      description: "Find curated learning paths with the best free and paid resources ranked for you. No noise, just the best path forward."
    },
    {
      icon: PenTool,
      title: "Active Note-Taking",
      description: "Take notes in our distraction-free markdown editor. Type ?? and >> to define what you want to master."
    },
    {
      icon: BrainCircuit,
      title: "Master by Recall",
      description: "Review exactly what you need, exactly when you need it, based on a scientifically proven spaced repetition schedule."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0908] overflow-hidden selection:bg-accent/30 text-white font-sans">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Navbar */}
      <nav className="absolute top-0 w-full p-4 md:p-10 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-accent" />
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
            className="text-xs md:text-sm font-semibold text-accent hover:text-[#0a0908] bg-accent/10 hover:bg-accent border border-accent/20 px-4 md:px-6 py-2 md:py-2.5 rounded-full transition-all duration-300"
          >
            Sign In
          </Link>
        )}
      </nav>

      {/* Main Hero Section */}
      <main className="relative pt-32 md:pt-40 pb-16 md:pb-20 px-4 md:px-6 max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
        
        {/* The Book Animation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 md:mb-16 relative transform scale-75 md:scale-100"
        >
          <div className="absolute inset-0 bg-accent/20 blur-[40px] md:blur-[60px] rounded-full scale-125 md:scale-150"></div>
          <div className="book relative z-10">
            <div className="book__pg-shadow"></div>
            <div className="book__pg"></div>
            <div className="book__pg book__pg--2"></div>
            <div className="book__pg book__pg--3"></div>
            <div className="book__pg book__pg--4"></div>
            <div className="book__pg book__pg--5"></div>
          </div>
        </motion.div>

        {/* Hero Copy */}
        <motion.h1 
          className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 md:mb-6 font-serif bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          What do you want to learn?
        </motion.h1>
        
        <motion.p 
          className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl font-light px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          A universal platform for structured study. Search a topic, follow a curated path, take notes, and turn them into recall prompts.
        </motion.p>

        {/* Search Bar Component */}
        <motion.div 
          className="relative w-full max-w-2xl z-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <form 
            onSubmit={handleSearch}
            className={`relative transition-all duration-500 rounded-2xl border ${isFocused ? 'border-accent shadow-[0_0_40px_rgba(245,158,11,0.2)] bg-[#14120f]/90' : 'border-white/10 bg-[#14120f]/60'} backdrop-blur-xl overflow-hidden`}
          >
            <div className="flex items-center px-4 md:px-6 py-3 md:py-4">
              <Search className={`h-5 w-5 md:h-6 md:w-6 transition-colors duration-300 ${isFocused ? 'text-accent' : 'text-gray-500'}`} />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent border-none outline-none text-white text-base md:text-lg px-3 md:px-4 placeholder-gray-500 font-medium"
                placeholder="e.g. AWS Solutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              />
              <button type="submit" className="hidden md:flex items-center gap-1 text-xs text-gray-500 hover:text-white hover:bg-white/10 bg-white/5 px-3 py-1.5 rounded-md border border-white/5 transition-colors cursor-pointer">
                Search <kbd className="ml-1 font-sans">↵</kbd>
              </button>
            </div>
          </form>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-20 md:mt-32 w-full text-left"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {features.map((feature, idx) => (
            <div key={idx} className="relative group bg-[#14120f]/40 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-3xl p-6 md:p-8 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="bg-accent/10 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-accent mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <feature.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-bold font-serif mb-2 md:mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>

      </main>
    </div>
  );
}
