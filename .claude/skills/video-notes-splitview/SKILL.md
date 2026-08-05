---
name: video-notes-splitview
description: Build, debug, and optimize the sticky embedded video split-view workspace, live note editor, transcript panel with click-to-copy/insert, and clickable timestamp capture (`cards.video_id` + `cards.t`).
when_to_use: "Work on video split view", "Fix YouTube player note editor", "Fix timestamp link capture", "Add video transcript to notes", "Optimize video note editor", "video-notes-splitview"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Video Split-View, Transcript & Note Taking Workspace Skill

This skill allows Claude Code to implement, debug, and refine Quad Encode's **Embedded Video Split-View, Live Note Editor, & Transcript Extraction system**, ensuring uninterrupted video playback, auto-saving markdown, interactive transcript line copying, and seamless timestamp linkage.

---

## Core Technical Specs (`AGENTS.md` §1, §7, §8)

1. **Split-View / Tri-Pane Layout:**
   - **Left Panel (Desktop 50–60%):** Pinned sticky iframe YouTube player + collateral transcript drawer/tab.
   - **Right Panel:** Independent scrolling Markdown note editor.
   - **Responsive:** Stacks vertically on mobile/tablet screens with the video player sticky at the top, transcript toggleable below, and editor at the bottom.

2. **Transcript Integration & Copy-to-Notes:**
   - **Interactive Lines:** Display time-stamped transcript segments sync-highlighted to `player.getCurrentTime()`.
   - **One-Click Insert:** Each transcript row includes a "Copy/Insert to Note" trigger that inserts selected text directly at the active cursor position in the Markdown editor.
   - **Format Rules:** Appends transcript text alongside the exact timestamp reference: `> "Selected transcript quote..." — [02:04](timestamp://video_id?t=124)`.

3. **Timestamp Capture Action (`cards.video_id` + `cards.t`):**
   - A dedicated **"Capture Timestamp"** button on the video toolbar reads current playback time (e.g., `124s`).
   - Automatically inserts a clickable link into the active Markdown editor line: `[02:04](timestamp://video_id?t=124)`.
   - Clicking any timestamp link inside the note jumps the player using `player.seekTo(seconds, true)` without reloading the iframe or resetting editor state.

4. **Live Auto-Save & Uninterrupted Playback:**
   - Debounced auto-save (`300ms–500ms`) to Supabase `notes` table.
   - Practice flashcards (`**Vocab:**` / `**Def:**`) and Quiz multiple-choice (`**Quiz:**` / `**A:**`) syntax can be typed or inserted live.
   - Editor and transcript re-renders **MUST NOT** trigger iframe reloads or video pauses.

---

## Execution Workflow

### Step 1: Audit Component Architecture
Inspect the real split-view components in this repo:

- `src/app/notes/[id]/NoteEditor.tsx` - split-view layout, note editor state, cursor positioning, and transcript integration.
- `src/components/video/VideoPlayer.tsx` - YouTube player built on `react-youtube` (using `YouTubePlayer` ref, avoiding raw iframe API re-mounts).
- `src/components/video/VideoTranscript.tsx` - transcript drawer/panel, handling transcript fetching, active line tracking, and insert-to-editor callbacks.

Check:
- **YouTube Player Embed:** Confirm `react-youtube` state isolation prevents full DOM unmounts during typing or transcript switching.
- **Editor Focus & Cursor Insertion:** Verify programmatically inserting transcript snippets places text cleanly at the editor's active selection without dropping focus.

---

### Step 2: Verification Checklist

#### 1. Transcript Capture & Copy-to-Notes Test
- Does clicking a line or "Insert to Note" in the transcript copy the clean text and append it with a valid timestamp link `[MM:SS](timestamp://...)`?
- Are filler words or messy formatting stripped prior to insertion if requested?

#### 2. Timestamp Insertion & Jump Test
- Does clicking **"Capture Timestamp"** insert the current video time into the editor cursor position?
- Does clicking a timestamp link inside the rendered note invoke `player.seekTo(seconds, true)` smoothly?

#### 3. Layout & Responsiveness
- Is the video panel sticky while the transcript and note editor scroll independently?
- Is there zero layout shift (CLS) when toggling between transcript drawer view and note editor view?

#### 4. Practice & Quiz Toolbar Constraints
- Are toolbar actions strictly producing **Flashcard** (`**Vocab:**` / `**Def:**`) or **Multiple Choice Quiz** (`**Quiz:**` / `**A:**`) templates?
- Does auto-save operate in the background without stealing text focus or interrupting video playback?

---

### Step 3: Refactor & Verification
1. Fix component state, event handlers, cursor insertion logic, or layout CSS in `src/`.
2. Verify TypeScript types (`cards.video_id: string`, `cards.t: number`).
3. Run `npm run build` or `npm run typecheck` to confirm zero build errors.
