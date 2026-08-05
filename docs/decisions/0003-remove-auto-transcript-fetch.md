# 0003: Remove auto-fetched video transcripts

## Context

The video split-view workspace auto-fetched each video's captions
(`fetchVideoTranscript`, via the `youtube-transcript` npm package) into a
clickable, click-to-seek transcript panel, with a copy-to-note action per
line. On the deployed Netlify site this frequently failed with "captions
are disabled," even for videos that visibly have captions.

Investigation (this session, via a live MCP browser session against the
production and branch-preview deploys, plus direct library calls from both
a local machine and the sandbox this session ran in):

- The failure reproduced 100% of the time on Netlify for a specific test
  video (a Professor Messer Security+ upload).
- The same video, same library, fetched 270 real caption lines successfully
  from a non-Netlify IP. The video has captions; the library's read of
  "disabled" was false.
- Root cause: YouTube treats Netlify's serverless egress IPs (AWS ranges)
  as likely-bot traffic and silently omits `captionTracks` from the player
  response for some requests, without an explicit block page. The library
  has no way to distinguish that from a genuinely caption-less video.
- `youtubei.js` was evaluated as a replacement (multi-client-context
  requests are more resilient to exactly this kind of soft suppression in
  general). It did not work at all, on any client context, from any IP,
  including a plain local test with no Netlify involved — version 17.2.0's
  `get_transcript` call returned HTTP 400 alongside internal parser errors
  (`TicketShelf not found`, `CourseProgressView` type mismatches),
  indicating the library itself is out of sync with YouTube's current page
  structure. Ruled out as broken, independent of the IP question.

## Decision

Removed the feature rather than ship something that fails silently or
misleadingly on production. Specifically removed:

- `fetchVideoTranscript` (`src/app/notes/[id]/actions.ts`)
- The transcript panel, transcript state, and `onInsertTranscript` prop in
  `VideoPlayer.tsx` / `NoteEditor.tsx`
- The `youtube-transcript` dependency
- The now-stale "Interactive transcript" / "Copy lines into your note"
  guide cards in `GuideModal.tsx`, replaced with cards for what's still
  true: Capture Timestamp, and clicking a captured timestamp link to jump
  back to that moment.

`VideoPlayer` keeps everything CLAUDE.md section 1 actually requires: the
embedded player pinned in the split-view column, and the "Capture
Timestamp" action inserting a clickable time-link into the note. Neither
depended on the transcript fetch.

## Tradeoff accepted

Losing the click-any-line-to-seek transcript and per-line copy-to-note
convenience. Manual timestamp capture (already required, already working)
remains the only way to link a note to a moment in the video.

## Options considered for a replacement, not built yet

- **Manual paste**: a text box where the user pastes the transcript text
  YouTube's own UI already lets them copy, parsed for `mm:ss` lines into
  the same clickable format. Guaranteed to work regardless of server IP;
  costs a small UI addition and a manual step per video.
- **Proxy service**: route the fetch through a paid residential-IP proxy.
  Actually fixes the root cause, but is a recurring cost and a new
  external dependency, and leans toward deliberately evading YouTube's bot
  detection - flagged for the product owner to decide on, not defaulted to.
- **YouTube Data API v3 chapters** instead of full captions: chapter
  markers (title + timestamp) via the official, authenticated Data API
  rather than the unofficial InnerTube/scrape surface. Coarser than a full
  transcript but not subject to the same soft-block behavior. Not built:
  needs a decision on whether coarse chapter jumps are worth shipping in
  place of line-level transcript.

No option was picked; revisit if this becomes a priority again.
