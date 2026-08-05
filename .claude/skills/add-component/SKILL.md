---
name: add-component
description: Use when the user pastes a UI snippet from UIverse (uiverse.io), an animation script from GSAP (gsap.com), an SVG illustration from unDraw (undraw.co), or any other third-party HTML/CSS/JS component and wants it added to this codebase. Also triggers on explicit invocation via /add-component. Handles source detection, framework adaptation (class→className, Tailwind/CSS-Modules/styled-components conversion), dependency install prompts (e.g. gsap), file placement, and wiring per this project's CLAUDE.md conventions.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm install:*), Bash(npm ls:*), Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm run build:*), Bash(find:*), Bash(ls:*)
argument-hint: [paste the component/snippet code, or a description + code]
---

# Add Component / Asset

You are integrating a third-party UI element, animation, or illustration into this codebase. Input: $ARGUMENTS

Follow these steps in order. Do not skip the CLAUDE.md read — it overrides every default below.

## 1. Identify the source and type

Inspect the pasted content and classify it:

- **UIverse** — raw HTML + CSS (often a single `<button>`/`<div>` block with a large inline or adjacent `<style>` block, BEM-ish or utility class names, no JS framework syntax).
- **GSAP** — JS referencing `gsap.to/from/fromTo/timeline`, `gsap.registerPlugin`, `ScrollTrigger`, `useGSAP`, or similar.
- **unDraw** — a standalone `<svg>` illustration, typically flat-color, single accent color (often `#6c63ff` or similar), no interactivity.
- **Other** — a generic React/Vue component, Tailwind snippet, or plain JS widget.

If the classification is ambiguous, say so and proceed with your best guess rather than blocking.

## 2. Read repository guidelines — mandatory

Before writing anything:

1. Look for and read `CLAUDE.md` (project root, then any nested ones near the target directory).
2. Look for `.claude/skills/*/SKILL.md` or `.claude/commands/*.md` siblings that describe component conventions.
3. Skim the existing directory structure (`src/components/`, `app/components/`, etc.) and 1-2 existing components to infer:
   - Styling system in actual use (Tailwind classes, CSS Modules, styled-components, plain CSS)
   - Naming convention (PascalCase files? kebab-case?)
   - Whether components are typed with `interface Props` / `type Props`, and where props types live
   - Export style (default export vs named export)

If no CLAUDE.md exists, say so explicitly and fall back to matching whatever pattern the nearest existing component uses — never invent a new convention when one already exists in the repo.

## 3. Adapt the snippet to this codebase

- HTML → JSX: `class` → `className`, `for` → `htmlFor`, self-close void elements, camelCase event handlers and style props, convert inline `style="..."` strings to a JS style object only if the rest of the codebase does the same (otherwise prefer the dominant styling system).
- CSS from UIverse: if the project uses Tailwind, convert to utility classes where a clean 1:1 mapping exists; keep bespoke/complex effects (gradients, keyframes, filters) as a scoped CSS Module or a `<style jsx>`/global stylesheet import, matching whatever the project already does for one-off effects. Never leave a raw unscoped `<style>` tag in a JSX file.
- GSAP: wrap animations in a `useEffect`/`useGSAP` hook with cleanup (`gsap.context` or `ctx.revert()` / `useGSAP`'s auto-cleanup) so it's safe under React StrictMode and unmount. Register any plugins (`ScrollTrigger`, etc.) once, guarded so it isn't re-registered on every render.
- unDraw SVG: inline as a React component (props for `className`/`width`/`height` at minimum) rather than pasting a giant inline SVG into a page file, unless the project's convention is otherwise. Strip unnecessary editor cruft (`id`s that collide, XML comments) but preserve `viewBox`.
- Vue targets (`v-bind`, `v-if`, etc.) only if this project is actually Vue — check `package.json` first; don't assume.
- Type the component's props with TypeScript if the project uses `.tsx` elsewhere.

## 4. Handle dependencies

- Check `package.json` for `gsap` (or other snippet-specific packages) before assuming it's missing.
- If missing, **ask the user before running `npm install <package>`** — state the package and version you intend to add, then run it only after they confirm.

## 5. Placement and intent — ask, don't guess, when it matters

- If the user specified a path, use it.
- If not, propose 1-2 concrete file paths based on the actual existing directory tree (e.g. `src/components/ui/GlowButton.tsx`) and briefly say which you're using and why, rather than silently picking one.
- If the snippet clearly needs dynamic data (a GSAP timeline driven by scroll position, a card needing a title/image prop, etc.) and the user hasn't specified it, ask a short clarifying question about props/state before finalizing the API — but still produce a sensible default implementation rather than blocking entirely.

## 6. Execute

1. Create/update the component file(s).
2. Wire up imports/exports and use the new component wherever the user indicated (or leave it ready-to-import if no target page was specified — say so).
3. Run the project's lint and typecheck scripts if defined in `package.json` (`npm run lint`, `npm run typecheck` / `tsc --noEmit`), and report any failures with fixes.
4. Summarize: source type detected, file(s) written, dependency changes, and any remaining manual step (e.g. "add your own image prop here").

## Non-negotiables

- Never invent a styling system the project doesn't already use.
- Never leave `class=` / raw HTML attributes in a `.jsx`/`.tsx` file.
- Never run `npm install` without confirming the package/version with the user first.
- Never fabricate a CLAUDE.md convention — if one truly doesn't exist, say so and default to matching the nearest existing component.
