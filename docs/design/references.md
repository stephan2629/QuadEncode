# Design references

Per CLAUDE.md section 12: name the problem, look at three or more references, write what each does well and what does not, then design from the comparison. Never copy code, assets, or a specific layout.

---

## Problem: how should markdown editing feel in the notes editor

This is the core writing surface for Phase 1. Section 18 already rules out a rich text editor in favor of a markdown textarea with preview, so the question here is how to make that plain textarea feel good, not whether to build something fancier.

**Obsidian.** Plain text markdown files, minimal chrome, no toolbar. The line under the cursor shows raw syntax; everything else renders (bold, headers, links) without a separate preview pane. Nothing pops up uninvited — a `[[` triggers a link search only because the user typed it. The feeling is closest to writing on paper that happens to understand formatting. Weakness for us: the inline live-render mode is a real engineering lift (parsing and re-rendering per line as the cursor moves) and is more than a Phase 1 markdown textarea needs.

**Notion.** Block-based, not plain text. Slash commands insert block types, selecting text raises a floating format toolbar, blocks have drag handles. It converts markdown shortcuds (`**`, `#`) into rendered formatting as you type, so it reads as WYSIWYG even though the input is markdown-flavored. Onboarding needs no tour because the UI teaches itself through the slash menu. Weakness for us: the block model adds indirection — clicking to target a block, waiting for a floating menu — that a fast note-taking flow during study doesn't need, and it's the rich-text-editor sinkhole section 18 explicitly rules out.

**Linear.** Not a notes app, but the reference point for keyboard-first speed. Command palette (Cmd+K) as the connective tissue for nearly everything, no visible waiting on transitions, text areas (issue descriptions) support markdown shortcuts with a small floating format bar on selection and otherwise no chrome. The discipline is: nothing moves unless the user caused it, and nothing sits on screen that isn't the current job. That maps directly onto section 11's motion rules and section 13's "one screen, one job."

**Codecademy** (the requested anchor, included for contrast). Its input surface is a syntax-highlighted code editor next to a step-by-step instruction panel — a split pane where neither side fights for attention. It isn't a prose editor and nothing about its editing mechanics transfers to markdown notes. What's worth keeping in mind for later screens (not the note editor) is the split-pane pattern itself: practice surface on one side, guidance on the other, both visible without switching views.

### What this means for the note editor

Plain textarea, not a block editor — Notion's model is off the table by spec, and the comparison confirms why: it trades typing speed for structure we don't need. Take Obsidian's restraint (no toolbar, nothing renders unless it has to) and Linear's discipline (no motion, no chrome, until the user acts) over Notion's guided-block approach. Skip Obsidian's full live-preview-per-line rendering for now — a toggleable preview pane is the Phase 1 version of the same idea at a fraction of the build cost. Revisit inline rendering only if a toggle proves annoying in practice.
