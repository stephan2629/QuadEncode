'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, SearchCheck, PenTool, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectSection } from '@/components/home/ConnectSection';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockSearchResults = [
    { id: '1', title: 'Music Theory', type: 'Subject' },
    { id: '2', title: 'AWS Solutions Architect', type: 'Certification' },
    { id: '3', title: 'Learning Spanish', type: 'Language' },
    { id: '4', title: 'Organic Chemistry', type: 'Science' },
    { id: '5', title: 'Project Management', type: 'Skill' }
  ].filter(res => res.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const steps = [
    {
      icon: SearchCheck,
      title: "Discover Paths",
      description: "Find curated learning paths with the best free and paid resources ranked for you."
    },
    {
      icon: PenTool,
      title: "Active Note-Taking",
      description: "Take notes in markdown. Type ?? and >> to define what you want to master."
    },
    {
      icon: BrainCircuit,
      title: "Master by Recall",
      description: "Review exactly what you need, exactly when you need it, based on spaced repetition."
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full flex flex-col justify-center min-h-[85vh]">
      <motion.header 
        className="flex flex-col items-center justify-center text-center w-full mb-20"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="mb-12">
          <div className="book">
            <div className="book__pg-shadow"></div>
            <div className="book__pg"></div>
            <div className="book__pg book__pg--2"></div>
            <div className="book__pg book__pg--3"></div>
            <div className="book__pg book__pg--4"></div>
            <div className="book__pg book__pg--5"></div>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-8 font-serif">
          What do you want to learn?
        </h1>
        
        <motion.div 
          className="relative w-full max-w-2xl group z-20"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-muted group-focus-within:text-accent transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-14 pr-6 py-5 bg-[#1a1815] border border-white/10 rounded-full text-xl text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all shadow-xl"
            placeholder="Search a topic, language, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </motion.div>
      </motion.header>

      {/* Search Results Dropdown */}
      <div className="max-w-2xl mx-auto w-full relative z-30 -mt-16 mb-16">
        <AnimatePresence>
          {searchQuery.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 w-full bg-[#1a1815] border border-white/5 rounded-2xl p-2 shadow-2xl"
            >
              {mockSearchResults.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.04 }
                    }
                  }}
                >
                  {mockSearchResults.map(result => (
                    <motion.div 
                      key={result.id}
                      variants={{
                        hidden: { opacity: 0, y: 4 },
                        visible: { opacity: 1, y: 0 }
                      }}
                    >
                      <div className="px-5 py-4 hover:bg-white/5 rounded-xl flex items-center justify-between group cursor-pointer transition-colors">
                        <span className="text-white font-medium text-lg group-hover:text-accent transition-colors">{result.title}</span>
                        <span className="text-xs text-muted uppercase tracking-wider">{result.type}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="px-5 py-8 text-muted text-center flex flex-col items-center">
                  <span className="text-white mb-2">No exact matches</span>
                  Press Enter to generate a new learning path for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How it works */}
      {searchQuery.length === 0 && (
        <motion.div 
          className="max-w-4xl mx-auto w-full mt-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.3 }
            }
          }}
        >
          <motion.div 
            className="text-center mb-10"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
            }}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">How Quad Encode Works</h2>
            <div className="h-px w-12 bg-white/10 mx-auto mt-4"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                className="bg-[#1a1815]/50 rounded-2xl p-6 border border-white/5 text-center flex flex-col items-center"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
                }}
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6 text-accent">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-white font-medium text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Connect Section (3D Carousel) */}
      <div className="mt-32 w-full max-w-screen-2xl mx-auto -mx-6 md:-mx-10 relative">
        <ConnectSection />
      </div>
    </div>
  );
}
