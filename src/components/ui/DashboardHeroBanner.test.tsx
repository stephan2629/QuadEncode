// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardHeroBanner } from './DashboardHeroBanner';

// CLAUDE.md section 3: stats appear at five or more cards, and below that
// they are absent rather than reading "0". This is the rule most likely to
// be undone by a later "the dashboard looks empty" change, so it's pinned.
describe('DashboardHeroBanner stats', () => {
  it('shows no stat tiles below five cards, rather than zeros', () => {
    render(<DashboardHeroBanner subjectName="Music theory" totalCards={0} dueCount={0} noteCount={3} />);
    expect(screen.queryByText('Total notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Flashcards')).not.toBeInTheDocument();
    expect(screen.getByText('Music theory')).toBeInTheDocument();
  });

  it('still hides them at four cards, the edge of the threshold', () => {
    render(<DashboardHeroBanner subjectName="Music theory" totalCards={4} dueCount={0} noteCount={3} />);
    expect(screen.queryByText('Flashcards')).not.toBeInTheDocument();
  });

  it('shows them from five cards', () => {
    render(<DashboardHeroBanner subjectName="Music theory" totalCards={5} dueCount={0} noteCount={3} />);
    expect(screen.getByText('Total notes')).toBeInTheDocument();
    expect(screen.getByText('Flashcards')).toBeInTheDocument();
  });

  it('shows the due tile on its own, since a due count is never zero when shown', () => {
    render(<DashboardHeroBanner subjectName="Music theory" totalCards={2} dueCount={2} noteCount={1} />);
    expect(screen.getByText('Due review')).toBeInTheDocument();
    expect(screen.queryByText('Flashcards')).not.toBeInTheDocument();
  });
});
