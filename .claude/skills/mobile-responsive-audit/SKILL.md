---
name: mobile-responsive-audit
description: Audit and enforce mobile-first responsive design across Quad Encode. Adjusts layout grids, button tap targets, typography scaling, image boundaries, and tablet/phone viewports.
when_to_use: "Make site mobile friendly", "Fix mobile layout", "Audit mobile responsiveness", "Check iPhone and iPad layout", "mobile-responsive-audit"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Mobile-First Responsive Audit & Refactoring Skill

This skill enforces strict mobile-first UI patterns across Quad Encode. It ensures every component renders smoothly across small phones (iPhone SE/13/15), foldables, tablets (iPad/iPad Pro), and desktop screens without broken widths or horizontal scrollbars.

---

## 📱 Mobile-First Breakpoint Architecture (`AGENTS.md`)

Tailwind CSS operates mobile-first by default. Base classes (unprefixed) apply to mobile. Prefixed classes (`sm:`, `md:`, `lg:`) override layout as viewport size increases.

| Viewport Target | Screen Width | Tailwind Variant | Common Devices |
| :--- | :--- | :--- | :--- |
| **Mobile (Base)** | `< 640px` | `(default / no prefix)` | iPhone SE, iPhone 13/14/15, Android phones |
| **Small Tablet / Large Phone** | `≥ 640px` | `sm:` | iPad Mini, Galaxy Fold, horizontal phones |
| **Tablet / Portrait iPad** | `≥ 768px` | `md:` | iPad Air, iPad Pro 11", small laptops |
| **Desktop / Laptop** | `≥ 1024px` | `lg:` | Laptops, Desktop monitors |
| **Wide Desktop** | `≥ 1280px` | `xl:` | Large monitors |

---

## 🎯 Mobile Responsiveness Standards

### 1. Touch Targets & Buttons
- **Minimum Tap Target:** Interactive elements (buttons, icons, tabs) MUST have a minimum tap area of **44x44px** (Apple Human Interface Guidelines) or **48x48px** (Google Material Design).
- **Spacing:** Ensure at least `gap-2` (8px) between adjacent clickable elements so users don't tap the wrong button.
- **Full-Width Action Buttons:** Primary Call-To-Actions (CTAs) on mobile screens should span full width (`w-full sm:w-auto`) to allow effortless thumb tapping.

```tsx
// ❌ BAD (Too small, hard to tap on phones)
<button className="px-2 py-1 text-xs">Submit</button>

// ✅ GOOD (Touch-friendly base, scales up cleanly)
<button className="w-full h-12 px-6 rounded-xl bg-amber-500 font-sans text-base font-semibold text-neutral-950 sm:w-auto">
  Submit
</button>
```

## Where this plugs in for this repo

Use `scripts/capture-screenshot.js` (`visual-audit-refactor` skill) with
`--viewport=390x844` (phone) and a tablet-width run for the iPad breakpoint
check, rather than guessing at layout from source alone. This project's own
accent color is `accent` (warm amber, see CLAUDE.md section 12's
`#14120F` background + one accent token), not Tailwind's default
`amber-500` - swap example snippets like the one above to the project's
actual token when applying a fix here, not the literal `bg-amber-500`.
