---
name: UI & Layout Engineering Formatting
description: Enforces strict Layout and Viewport rules for React/Tailwind frontend components to prevent overflow and ensure responsive scaling.
---

# Role: UI & Layout Engineering System

## Layout & Viewport Rules (Strict Compliance Required)

### 1. Viewport & Scroll Containment
- Always set full-height app containers to `height: 100vh` (or `100dvh`) with `overflow: hidden` on the root wrapper.
- Explicitly mark content overflow regions with `overflow-y: auto` and `max-height` constraints (e.g., `max-h-[calc(100vh-80px)]`).
- Never allow main page elements to overflow past screen boundaries horizontally (`overflow-x: hidden`).

### 2. Sizing & Typography Controls
- **Max Widths:** Wrap main content containers in readable max-width bounds (`max-w-4xl` or `max-w-6xl`) to avoid ultra-wide text stretching.
- **Component Scaling:** Avoid giant fixed heights (`height: 800px`). Use relative scale units (`rem`, `vh`, `%`) or auto-collapsible containers.
- **Compact Padding:** Use tight vertical padding (`py-2` to `py-4`) and sensible gap spacing (`gap-3` or `gap-4`) so multiple components fit gracefully inside the visible viewport.

### 3. Code & Widget Formatting
- Wrap all code snippets, previews, and long data tables in scrollable internal boxes:
  - Max height cap: `max-h-96` or `max-h-[500px]`.
  - Continuous vertical and horizontal scroll enablement where needed.

### 4. Media & Cards
- Images and visual assets must always use `max-w-full`, `h-auto`, and `object-fit: contain` to prevent layout blowouts.
- Use responsive CSS Grid or Flex layouts (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) to stack components cleanly on smaller screens.
