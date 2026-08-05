---
name: video-notes-splitview
description: Build, debug, and optimize the sticky embedded video split-view workspace, live note editor, and clickable timestamp capture feature (`cards.video_id` + `cards.t`).
when_to_use: "Work on video split view", "Fix YouTube player note editor", "Fix timestamp link capture", "Optimize video note editor", "video-notes-splitview"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Video Split-View & Note Taking Workspace Skill

This skill allows Claude Code to implement, debug, and refine Quad Encode's **Embedded Video Split-View & Live Note Editor**, ensuring uninterrupted video playback, auto-saving markdown, and seamless timestamp linkage.

---

## Core Technical Specs (`AGENTS.md` §1, §7, §8)

1. **Split-View Layout:**
   - Left/Top Panel (50–60% desktop width): Pinned sticky iframe YouTube player.
   - Right/Bottom Panel: Independent scrolling Markdown note editor.
   - Responsive: On mobile screens, stacks vertically with video sticky on top and editor below.

2. **Timestamp Capture Action (`cards.video_id` + `cards.t`):**
   - A dedicated **"Capture Timestamp"** button on the video toolbar reads the current playback time (e.g., `124s`).
   - Automatically inserts a clickable link into the active Markdown editor line: `[02:04](timestamp://video_id?t=124)`.
   - Clicking any timestamp link anywhere in the note jumps the player to that exact second without reloading the iframe or resetting editor state.

3. **Live Auto-Save & Uninterrupted Playback:**
   - Debounced auto-save (`300ms–500ms`) to Supabase `notes` table.
   - Inline syntax (`**Vocab:**` / `**Def:**` and `**Quiz:**` / `**A:**`) can be typed live while watching.
   - Editor re-renders MUST NOT trigger iframe reloads or video pauses.

---

## Execution Workflow

### Step 1: Audit Component Architecture
Inspect the real split-view components in this repo (not a generic
`src/components/workspace/` path):

- `src/app/notes/[id]/NoteEditor.tsx` - the split-view layout and note
  editor, wiring timestamp capture into the markdown.
- `src/components/video/VideoPlayer.tsx` - the YouTube player, already
  built on `react-youtube` (a `YouTubePlayer` ref, not raw iframe API calls).

Check:
- **YouTube Player Embed:** Confirm `react-youtube` usage doesn't cause full
  DOM unmounts on note state updates.
- **Editor Isolation:** Verify state management isolates typing state from
  the parent layout to prevent video frame flashes.

### Step 2: Verification Checklist

#### 1. Timestamp Insertion & Jump Test
- Does clicking **"Capture Timestamp"** insert the current video time into the cursor position in Markdown?
- Does clicking a timestamp link invoke `player.seekTo(seconds, true)` smoothly?

#### 2. Layout & Responsiveness
- Is the video panel sticky while the note editor scrolls independently?
- Is there zero layout shift (CLS) when toggling between full-screen editor and split-view?

#### 3. Editor Toolbar Actions
- Are toolbar shortcuts available for `**Vocab:**` / `**Def:**` and `**Quiz:**` / `**A:**` templates?
- Is auto-save running in the background without stealing text focus or pausing the video?

---

### Step 3: Refactor & Verification
1. Fix component state, event handlers, or layout CSS in `src/`.
2. Verify TypeScript types (`cards.video_id: string`, `cards.t: number`).
3. Run `npm run build` or `npm run typecheck` to confirm zero build errors.
