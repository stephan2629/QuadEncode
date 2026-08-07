// A flip card's faces are a fixed aspect-ratio box (ReviewSession,
// PracticeTab). A short definition centers fine at the site's usual size,
// but a long one either overflows the card or forces a mid-review
// scrollbar. Shrinking the font as text grows keeps the whole thing on one
// face instead.
//
// `sizes` runs largest to smallest, with index 0 matching whatever the call
// site already used as its default - so a typical short answer renders
// exactly as it did before this existed, and only long text steps down.
// Thresholds step down earlier than they first did (was 70/140/240). An
// AI-generated definition regularly lands in the 80-160 character range,
// which the old first step left at full size and overflowed a card that
// also has to hold a label row and a hint row. A fifth, smallest step
// catches the genuinely long ones (a pasted paragraph, a multi-clause quiz
// answer) that used to bottom out and still overflow.
export function flashcardTextSizeClass(
  text: string,
  sizes: readonly [string, string, string, string, string]
): string {
  const len = text.length;
  if (len > 320) return sizes[4];
  if (len > 190) return sizes[3];
  if (len > 110) return sizes[2];
  if (len > 55) return sizes[1];
  return sizes[0];
}
