// CompTIA (and similar) certifications officially use "+" in their name
// (Network+, Security+, A+, CySA+...), but people commonly type or say
// "Plus" instead. The web/YouTube searches in study/[query]/actions.ts are
// literal keyword matches, so without this the actual "Network+"
// videos/playlists never surface as candidates for a "Network Plus" query -
// the AI prompt can only pick from whatever those searches actually return
// (it's explicitly told not to invent a URL), so it can't recover a
// candidate that was never fetched in the first place.
export function normalizeCertPlus(query: string): string {
  return query.replace(/\s+plus\b/gi, '+');
}
