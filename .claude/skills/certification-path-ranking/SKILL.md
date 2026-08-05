---
name: Certification & Exam Query Path Rules
description: Rules for structuring learning paths when a search query names a certification, credential, or exam (e.g. CompTIA, AWS Solutions Architect, CCNA, Azure Fundamentals, PMP). Use when touching path generation in src/app/study/[query]/actions.ts or its prompt.
---

# Certification & Exam Queries Rule

When the user's search query names a certification, credential, or exam prep
target (e.g. "CompTIA prep", "AWS Solutions Architect", "CCNA", "Azure
Fundamentals", "PMP"), the generated path must follow these rules.

## 1. Structured progression path

Generate a complete, end-to-end path divided into logical stages (for
example: Prerequisites/Foundations -> Core Exam Objectives -> Practice &
Revision). If the query implies a standard multi-part track (such as the
CompTIA trifecta: A+ -> Network+ -> Security+), structure the stages to
reflect that full progression rather than covering only the first cert named.

## 2. Free-first ranking (mandatory)

- Rank the highest-quality 100% free resource at the top (#1 position) of
  every stage.
- Prioritize well-known, community-trusted free educators and full YouTube
  playlist courses (Professor Messer for CompTIA, freeCodeCamp, Stephane
  Maarek / AWS official free video courses, NetworkChuck).
- Rank full video playlist courses ahead of fragmented blog posts, general
  articles, or paid landing pages (Udemy, Coursera, etc).

## 3. No marketing buzzwords

Objective, plain-text descriptions for every resource: "A 12-hour video
course covering AWS core services and security practices," not "Unlock your
career with this journey." Same house style as CLAUDE.md section 19.

## Where this plugs in

This project already has a free-first sort and a "top free creator" rule in
the path-generation prompt (`src/app/study/[query]/actions.ts`). This skill
adds the certification-specific piece on top: multi-stage structuring. If
implementing:

- The prompt needs to detect a cert/exam query and, when it applies, ask the
  model for a `stage` label per resource reflecting the progression.
- Free-first sort should apply within each stage, not just across the whole
  flat list (stage order must be preserved).
- `PathResource`/`PathTimeline` need an optional `stage` field to render
  stage headers instead of a flat step list, without breaking the existing
  non-cert flat path.
