# 0002: Video split-view fixes and note editor scope

## Context

Phase 5 polish surfaced three related problems in the video split-view
workspace and the note editor:

1. The embedded YouTube player froze visually on window resize (audio kept
   playing, the frame didn't repaint) because the mobile and desktop layouts
   each mounted their own `<VideoPlayer>` instance — one merely CSS-hidden,
   not unmounted — doubling embeds and transcript fetches, and because
   nothing told the YouTube IFrame API to resize its internal player on
   container resize.
2. The #1 ranked path step is very often a full YouTube playlist rather than
   a single video (the top-free-creator rule explicitly ranks Professor
   Messer-style playlists first), which has no single embeddable video id —
   "Take notes" silently never appeared for that step.
3. A request to make the note editor "look like a Word doc" ran directly
   into the project's standing rule against a rich text editor.

## Decisions

**One `<VideoPlayer>` instance, not two.** The desktop and mobile blocks in
`NoteEditor.tsx` were merged into a single conditionally-styled instance
(`hidden`/`flex` below `lg:`, always `lg:flex` at `lg:` and up) plus a
`ResizeObserver` in `VideoPlayer.tsx` that calls `player.setSize()` on
container resize. Tradeoff: the responsive class string is a little denser
than two separate blocks, but it's one video element, one transcript fetch,
and no dead-frame-on-resize bug.

**Resolve a playlist's first video server-side.** `resolveFirstPlaylistVideoId`
hits the YouTube `playlistItems` API and `createNoteForPlaylist` wraps
`createNoteForVideo` with that result. Tradeoff: a playlist-backed note only
ever gets the playlist's first video, not the whole series — accepted
because the data model (`notes.video_id`, `cards.video_id`/`cards.t`) is
built around one specific video per note, and re-deriving that for a
multi-video playlist is a bigger change than this phase warrants.

**No rich text editor, added a markdown formatting toolbar instead.**
CLAUDE.md section 20 is explicit: "No rich text editor... WYSIWYG is a
multi-week sinkhole." That still holds — no contentEditable engine, no
markdown-to-rich-text-and-back conversion. What shipped instead: toolbar
buttons above the plain `<textarea>` that insert markdown syntax
(bold/italic/heading/list) at the cursor, which is the same
insert-at-cursor mechanism the timestamp capture and cloze creation already
use. This is deliberately *not* the `+Vocab`/`+Quiz` template buttons
section 23 forbids in this editor — this is generic text formatting, not
card templates.

## Tradeoff accepted

The editor still isn't "Word-like" in the sense of live-rendered bold text
while typing — it's markdown source with a live Preview toggle, same as
before. Users who want to see formatted output still switch to Split/Preview
rather than seeing it inline. Full inline rendering would mean a rich text
engine, which is the sinkhole section 20 is guarding against.
