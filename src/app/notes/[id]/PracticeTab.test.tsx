// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeTab from './PracticeTab';

function makeCard(overrides: Partial<Parameters<typeof PracticeTab>[0]['cards'][0]> = {}) {
  return {
    id: 'card-1',
    line: 0,
    type: 'vocab',
    prompt: 'Spaced repetition',
    answer: 'Reviewing material at increasing intervals.',
    ...overrides,
  };
}

describe('PracticeTab', () => {
  it('starts a session without crashing (regression: hooks were declared after early returns)', () => {
    render(<PracticeTab cards={[makeCard()]} />);
    fireEvent.click(screen.getByText('Start Practice'));
    expect(screen.getByText('Spaced repetition')).toBeInTheDocument();
  });

  it('flips a vocab card to reveal its answer', () => {
    render(<PracticeTab cards={[makeCard()]} />);
    fireEvent.click(screen.getByText('Start Practice'));
    fireEvent.click(screen.getByText('Spaced repetition'));
    expect(screen.getByText('Reviewing material at increasing intervals.')).toBeInTheDocument();
  });

  it('treats a pipe-separated answer as a quiz card, not a plain flip card', () => {
    render(<PracticeTab cards={[makeCard({ answer: 'Correct opt | Wrong 1 | Wrong 2' })]} />);
    fireEvent.click(screen.getByText('Start Practice'));
    expect(screen.getByText('Correct opt')).toBeInTheDocument();
    expect(screen.getByText('Wrong 1')).toBeInTheDocument();
  });

  it('reaches the results screen after finishing the last card without crashing', () => {
    render(<PracticeTab cards={[makeCard()]} />);
    fireEvent.click(screen.getByText('Start Practice'));
    fireEvent.click(screen.getByText('Spaced repetition'));
    fireEvent.click(screen.getByText('Finish'));
    expect(screen.getByText('Practice Complete')).toBeInTheDocument();
  });
});
