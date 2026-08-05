// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeTab from './PracticeTab';

const sampleContent = `
**Vocab:** Spaced repetition
**Def:** Reviewing material at increasing intervals.
`;

const twoCardContent = `
**Vocab:** Spaced repetition
**Def:** Reviewing material at increasing intervals.

**Vocab:** Active recall
**Def:** Retrieving information from memory without cues.
`;

describe('PracticeTab', () => {
  // Session state now persists to real sessionStorage keyed by noteId, so
  // each test gets its own noteId (plus a clear, belt-and-suspenders) to
  // avoid one test's leftover stage/index bleeding into the next.
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts a session without crashing (regression: hooks were declared after early returns)', () => {
    render(<PracticeTab content={sampleContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    expect(screen.getByText('Spaced repetition')).toBeInTheDocument();
  });

  it('flips a vocab card to reveal its answer', () => {
    render(<PracticeTab content={sampleContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    fireEvent.click(screen.getByText('Spaced repetition'));
    expect(screen.getByText('Reviewing material at increasing intervals.')).toBeInTheDocument();
  });

  it('reaches the results screen after finishing the last card without crashing', () => {
    render(<PracticeTab content={sampleContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    fireEvent.click(screen.getByText('Spaced repetition'));
    fireEvent.click(screen.getByText('Finish'));
    expect(screen.getByText('Practice complete')).toBeInTheDocument();
  });

  // "Start practice" shuffles the two cards, so which term shows first is
  // not deterministic - match either rather than hardcoding one.
  const CARD_TERM = /^(Spaced repetition|Active recall)$/;

  it('resumes mid-session on remount (e.g. a tab refresh) instead of starting over', () => {
    const { unmount } = render(<PracticeTab noteId="note-1" content={twoCardContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    fireEvent.click(screen.getByText(CARD_TERM)); // reveal card 1
    fireEvent.click(screen.getByText('Next card')); // advance to card 2
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Simulate a refresh: unmount and mount a fresh instance with the same
    // noteId, exactly what happens across a real page reload.
    unmount();
    render(<PracticeTab noteId="note-1" content={twoCardContent} />);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.queryByText('Start practice')).not.toBeInTheDocument();
  });

  it('"Start over" abandons the session and clears it so a later remount starts fresh', () => {
    const { unmount } = render(<PracticeTab noteId="note-2" content={twoCardContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    fireEvent.click(screen.getByText('Start over'));
    expect(screen.getByText('Start practice')).toBeInTheDocument();

    unmount();
    render(<PracticeTab noteId="note-2" content={twoCardContent} />);
    expect(screen.getByText('Start practice')).toBeInTheDocument();
  });

  it('does not resume a session saved under a different note', () => {
    const { unmount } = render(<PracticeTab noteId="note-a" content={twoCardContent} />);
    fireEvent.click(screen.getByText('Start practice'));
    fireEvent.click(screen.getByText(CARD_TERM));
    fireEvent.click(screen.getByText('Next card'));
    unmount();

    render(<PracticeTab noteId="note-b" content={twoCardContent} />);
    expect(screen.getByText('Start practice')).toBeInTheDocument();
  });
});
