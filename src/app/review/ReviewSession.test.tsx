// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewSession from './ReviewSession';

vi.mock('./actions', () => ({
  submitReview: vi.fn().mockResolvedValue({ success: true }),
  keepCard: vi.fn().mockResolvedValue({ success: true }),
  updateCard: vi.fn().mockResolvedValue({ success: true }),
  deleteCard: vi.fn().mockResolvedValue({ success: true }),
  graduateCard: vi.fn().mockResolvedValue({ success: true }),
}));

import { submitReview, keepCard, graduateCard } from './actions';

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

  it('shows the completion screen instead of crashing once the last card is answered', async () => {
    render(<ReviewSession initialQueue={[makeCard({ box: 2 })]} />);
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Correct'));
    expect(await screen.findByText('Review Complete!')).toBeInTheDocument();
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

  it('lets a multiple-choice card be picked and advanced to completion without crashing', async () => {
    render(
      <ReviewSession
        initialQueue={[makeCard({ box: 2, answer: 'Correct opt | Wrong 1 | Wrong 2' })]}
      />
    );
    fireEvent.click(screen.getByText('Correct opt'));
    const next = await screen.findByText('Next question');
    fireEvent.click(next);
    expect(await screen.findByText('Review Complete!')).toBeInTheDocument();
  });

  it('prompts to re-explain instead of advancing when submitReview signals readyToGraduate, then graduates the card', async () => {
    vi.mocked(submitReview).mockResolvedValueOnce({ success: true, readyToGraduate: true });
    render(
      <ReviewSession
        initialQueue={[
          makeCard({ id: 'card-9', tier: 'imported', box: 2, answer: 'Correct opt | Wrong 1 | Wrong 2' }),
        ]}
      />
    );
    fireEvent.click(screen.getByText('Correct opt'));
    const next = await screen.findByText('Next question');
    fireEvent.click(next);

    // Graduation intercepts the advance instead of going straight to the
    // completion screen, even though this is the last card in the queue.
    expect(await screen.findByText(/Explain it in your own words/)).toBeInTheDocument();
    expect(screen.queryByText('Review Complete!')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Explain this concept/), {
      target: { value: 'It works because of X.' },
    });
    fireEvent.click(screen.getByText('Continue'));

    await screen.findByText('Review Complete!');
    expect(graduateCard).toHaveBeenCalledWith('card-9', 'It works because of X.');
  });

  it('reveals a vocab definition after an attempt is typed, and advances', async () => {
    render(
      <ReviewSession
        initialQueue={[makeCard({ type: 'vocab', box: 2, prompt: 'Term', answer: 'A cell powerhouse.' })]}
      />
    );
    const reveal = screen.getByText('Reveal the definition');

    // Nothing typed yet: the definition stays hidden and the button is dead.
    expect(reveal).toBeDisabled();
    fireEvent.click(reveal);
    expect(screen.queryByText('A cell powerhouse.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Type what you remember...'), {
      target: { value: 'my guess' },
    });
    fireEvent.click(screen.getByText('Reveal the definition'));
    expect(screen.getByText('A cell powerhouse.')).toBeInTheDocument();
    expect(screen.getByText('my guess')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Correct'));
    expect(await screen.findByText('Review Complete!')).toBeInTheDocument();
  });
});
