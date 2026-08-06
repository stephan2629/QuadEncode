// A flip card's faces are a fixed aspect-ratio box (ReviewSession,
// PracticeTab). A short definition centers fine at the site's usual size,
// but a long one either overflows the card or forces a mid-review
// scrollbar. Shrinking the font as text grows keeps the whole thing on one
// face instead.
//
// `sizes` runs largest to smallest, with index 0 matching whatever the call
// site already used as its default - so a typical short answer renders
// exactly as it did before this existed, and only long text steps down.
export function flashcardTextSizeClass(
  text: string,
  sizes: readonly [string, string, string, string]
): string {
  const len = text.length;
  if (len > 240) return sizes[3];
  if (len > 140) return sizes[2];
  if (len > 70) return sizes[1];
  return sizes[0];
}
