// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeTab from './PracticeTab';

const sampleContent = `
**Vocab:** Spaced repetition
**Def:** Reviewing material at increasing intervals.
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
});
