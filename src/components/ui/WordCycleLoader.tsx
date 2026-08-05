// Adapted from a UIverse.io component by kennyotsu. Keyframes live in
// globals.css (word-cycle) next to the project's other one-off animations
// (fade-in-up) - the timing is hand-tuned for exactly 5 stacked words with
// the 5th repeating the 1st for a seamless loop, so this isn't a generic
// variable-length word list.
const WORDS = ['videos', 'playlists', 'docs', 'guides', 'videos'] as const;

export default function WordCycleLoader() {
  return (
    <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
      <span>loading</span>
      <div className="word-loader-words h-5">
        {WORDS.map((word, i) => (
          <span key={i} className="word-loader-word text-accent">
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
