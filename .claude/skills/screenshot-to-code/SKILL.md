---
name: screenshot-to-code
description: Use when an image or screenshot (from any website, app, or design tool like Figma/Sketch) is uploaded, pasted, or attached and the user wants it turned into frontend code. Parses layout, design tokens, and components from the image and generates production-ready component code matching the current project's stack.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(find:*), Bash(ls:*), Bash(npm run lint:*), Bash(npm run typecheck:*)
---

# Screenshot-to-Code UI Parsing Skill

When an image or screenshot is uploaded, pasted, or attached, parse it into production-ready frontend code matching the existing project stack.

## 1. Scope & acceptance

- Accept screenshots from any website, application, design tool (Figma, Sketch), or platform.
- Ignore account details, personal user info, or site-specific watermarks unless explicitly requested. Never transcribe real emails, names, card numbers, or other identifying data into the generated code or mock data — use obvious placeholders instead.
- Before writing code, check the target codebase's own conventions (a `CLAUDE.md`, `AGENTS.md`, or similar) for anything the screenshot's content would conflict with (e.g. a billing/paid-tier UI in a product whose docs say not to build paid tiers yet). If there's a conflict, flag it and ask how to proceed (skip it, build unwired/standalone, or build and wire in anyway) instead of silently shipping it.

## 2. Analysis & extraction phase

- **Layout & structure:** identify header, sidebar, navigation, primary content grid, cards, and modal elements.
- **Design tokens:** extract approximate color palette (hex/CSS variables), typography hierarchy, spacing (padding/margins), and border radii — but prefer the target project's own existing design tokens/CSS variables over inventing new ones, if the project already has a design system.
- **Components & icons:** identify UI primitives (buttons, inputs, toggles, tables, icons) and substitute them with standard Lucide/Heroicons equivalents or framework-native components already used in the project.

## 3. Execution & code generation

1. **Detect stack:** identify the tech stack of the target repository (e.g. React + Tailwind CSS, Vue + CSS Modules, Next.js + shadcn/ui, raw HTML/CSS) by checking `package.json` and a sample of existing components before writing anything.
2. **Implement components:**
   - Write fully functional, responsive component code mirroring the visual layout.
   - Use clean, modular structure with dummy/mock data props so it works immediately with no required props.
   - Ensure interactive elements (buttons, inputs, dropdowns) have standard state hooks (`useState`, bindings) only where actual interactivity is needed.
3. **Handle non-standard UI:**
   - Transcribe data tables into structured arrays/mapped JSX.
   - Replace embedded images with SVG placeholders or `https://placehold.co/` URLs.

## 4. Output format

- Provide one brief sentence confirming the detected layout.
- Output the complete, copy-pasteable component file directly.
- Add concise instructions on where to save or import the component in the current project.
- Do not wire the new component into routes, nav, or app state unless the user asked for that — default to a standalone file the user can opt into.
