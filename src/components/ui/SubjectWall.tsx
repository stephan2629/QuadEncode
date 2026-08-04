import styles from './SubjectWall.module.css';

const SUBJECTS = [
  'Learning Spanish', 'AWS Solutions Architect', 'Music Theory', 'Organic Chemistry',
  'Project Management', 'Prompting AI Well', 'Guitar Chords', 'Japanese Kanji',
  'Linear Algebra', 'Watercolor Painting', 'Public Speaking', 'Docker & Containers',
  'Constitutional Law', 'Chess Openings', 'Wine Tasting', 'Intro Statistics',
  'Photography Basics', 'French Verbs', 'Machine Learning', 'Personal Finance',
  'Calligraphy', 'CompTIA A+', 'Poetry Writing', 'Human Anatomy', 'Negotiation',
];

const COLUMN_DIRECTIONS = ['up', 'down', 'up', 'down', 'up'] as const;

export default function SubjectWall() {
  return (
    <div className={styles.columnWrapper} aria-hidden="true">
      <div className={styles.columns}>
        {COLUMN_DIRECTIONS.map((dir, col) => (
          <div key={col} className={`${styles.column} ${styles[dir]}`}>
            {Array.from({ length: 10 }, (_, row) => {
              const subject = SUBJECTS[(col * 7 + row) % SUBJECTS.length];
              return (
                <div key={row} className={styles.tile}>
                  <span className={styles.tileIndex}>{String(row + 1).padStart(2, '0')}</span>
                  <span className={styles.tileName}>{subject}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
