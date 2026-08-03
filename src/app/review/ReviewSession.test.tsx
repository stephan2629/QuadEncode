// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewSession from './ReviewSession';

vi.mock('./actions', () => ({
  submitReview: vi.fn().mockResolvedValue({ success: true }),
  keepCard: vi.fn().mockResolvedValue({ success: true }),
  updateCard: vi.fn().mockResolvedValue({ success: true }),
  deleteCard: vi.fn().mockResolvedValue({ success: true }),
}));

import { submitReview, keepCard } from './actions';

function makeCard(overrides: Partial<Parameters<typeof ReviewSession>[0]['initialQueue'][0]> = {}) {
  return {
    id: 'card-1',
    note_id: 'note-1',
    line: 4,
    tier: 'authored',
    type: 'basic',
    prompt: 'What does a diminished chord sound like?',
    answer: 'Tense and unstable.',
    box: 2,
    due: new Date().toISOString(),
    fails: 0,
    ...overrides,
  };
}

describe('ReviewSession', () => {
  it('hides the answer until Show Answer is pressed, then reveals it with no reveal animation gate', () => {
    render(<ReviewSession initialQueue={[makeCard()]} />);
    expect(screen.queryByText('Tense and unstable.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show Answer'));
    expect(screen.getByText('Tense and unstable.')).toBeInTheDocument();
  });

  it('shows binary Correct/Wrong for a card past box 0, not a three-way rating', () => {
    render(<ReviewSession initialQueue={[makeCard({ box: 2 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Wrong')).toBeInTheDocument();
    expect(screen.queryByText('Hard')).not.toBeInTheDocument();
    expect(screen.queryByText('Easy')).not.toBeInTheDocument();
  });

  it('calls submitReview(cardId, true) on Correct', () => {
    render(<ReviewSession initialQueue={[makeCard({ id: 'card-42', box: 2 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Correct'));
    expect(submitReview).toHaveBeenCalledWith('card-42', true);
  });

  it('shows Keep/Edit/Delete instead of Correct/Wrong for a box-0 card', () => {
    render(<ReviewSession initialQueue={[makeCard({ box: 0 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    expect(screen.getByText('Keep')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Correct')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
  });

  it('calls keepCard on Keep for a box-0 card', () => {
    render(<ReviewSession initialQueue={[makeCard({ id: 'card-7', box: 0 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Keep'));
    expect(keepCard).toHaveBeenCalledWith('card-7');
  });

  it('shows a Jump to note link pointing at the card back pointer after Wrong', async () => {
    render(<ReviewSession initialQueue={[makeCard({ note_id: 'note-99', line: 7, box: 2 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Wrong'));
    const link = await screen.findByText('Jump to note');
    expect(link.closest('a')).toHaveAttribute('href', '/notes/note-99?line=7');
  });
});
