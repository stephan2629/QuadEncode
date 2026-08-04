'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';

export default function StudyHeatmap({ reviewDates }: { reviewDates: string[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    reviewDates.forEach((dateStr) => {
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [reviewDates]);

  // Generate dates
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    // We want to generate enough days to fill exactly X weeks, ending on today.
    // Let's generate 10 weeks of data (70 days) for a nice grid.
    for (let i = 69; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push({ date: d, key, count: counts.get(key) || 0 });
    }
    return arr;
  }, [counts]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-white/5 border-white/5';
    if (count < 10) return 'bg-accent/40 border-accent/20';
    if (count < 30) return 'bg-accent/70 border-accent/50';
    return 'bg-accent border-accent/80';
  };

  const legendItems = [
    { color: 'bg-white/5 border-white/5' },
    { color: 'bg-accent/40 border-accent/20 shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
    { color: 'bg-accent/70 border-accent/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
    { color: 'bg-accent border-accent/80 shadow-[0_0_16px_rgba(245,158,11,0.5)]' },
  ];

  return (
    <div className="bg-[#14120f] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20 transition-opacity group-hover:opacity-100 opacity-50 pointer-events-none" />

      <div className="overflow-x-auto custom-scrollbar pb-2 relative z-10">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
          {days.map((day) => (
            <div
              key={day.key}
              title={`${day.count} reviews on ${day.date.toDateString()}`}
              className={`w-3.5 h-3.5 rounded-sm border ${getColor(day.count)} transition-all hover:scale-125 hover:z-10 cursor-default`}
            />
          ))}
        </div>
      </div>

      {/* Animated Less -> More Legend Bar */}
      <m.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400 relative z-10 font-mono select-none"
      >
        <span className="text-gray-500 font-sans">Less</span>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
          {legendItems.map((item, idx) => (
            <m.div
              key={idx}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.35, y: -2 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: idx * 0.08,
              }}
              className={`w-3.5 h-3.5 rounded-sm border ${item.color} cursor-pointer transition-colors duration-300`}
            />
          ))}
        </div>

        <span className="text-accent font-semibold font-sans">More</span>
      </m.div>
    </div>
  );
}

