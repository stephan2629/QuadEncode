---
name: deploy-checklist
description: Pre-deploy checklist for QuadEncode - checks for build errors, updates the README, and ships to GitHub/Netlify. Use when the user asks to deploy, ship, push to production, or "add to GitHub".
---

# Deploy Checklist

Run this before shipping changes to Netlify: verify nothing is broken, keep
the README in sync with what actually shipped, then commit/push per this
repo's branch-first convention (CLAUDE.md working agreements).

## Command trigger

Use when the user asks to:
- "Deploy the site" / "ship this" / "push to production"
- "Add to GitHub" / "update the README and deploy"
- `deploy-checklist`

## Execution workflow

### Step 1: stop the dev server before building

`next build` and `next dev` share the same Turbopack persistent cache
(`.next/dev`) - running both at once has corrupted it before (site-wide
500s until `.next` is wiped and the server restarted). Kill any running
`npm run dev` process for this repo first - check for other unrelated
projects' dev servers before killing anything:

```bash
ps aux | grep "next dev" | grep -v grep
pkill -f "QuadEncode/node_modules/.bin/next dev"
```

### Step 2: check for build errors

Run all four CI gates locally, cheapest first, so a failure is caught
before the expensive step:

```bash
npm run lint
npm run typecheck
npm run test
rm -rf .next && npm run build
```

Fix anything red before continuing - don't commit on a broken build. The
same four checks run in `.github/workflows/ci.yml` on every push, so a
clean local run here means CI won't block the PR either.

### Step 3: update the README

CLAUDE.md section 18: every phase updates `README.md`'s "Current state"
section with what actually shipped. Fold new capabilities into the
relevant phase paragraph rather than appending a line-by-line changelog -
git history is the changelog. Also check whether `/docs/decisions/`,
`/docs/api.md`, or `/docs/design/references.md` need a note per the same
section.

### Step 4: branch, commit, push

This repo's working agreement: "If on the default branch, branch first."
Never commit straight to `main`:

```bash
git status --short   # review before staging - skip stray debug/scratch scripts
git checkout -b <descriptive-branch-name>
git add -A
git commit -m "..."
git push -u origin <branch-name>
```

End commit messages with the Co-Authored-By trailer this environment uses.

### Step 5: deploy

Netlify is connected to this GitHub repo (`netlify.toml` +
`@netlify/plugin-nextjs`). Pushing a branch triggers an automatic Netlify
**branch deploy** (a preview URL) - that already is the deploy, there's no
separate manual trigger to run. Merging that branch to `main` (e.g. via a
PR, `gh pr create`) is what ships it to production
(`https://quadencode.netlify.app`). Report the branch/PR URL back; confirm
the actual preview URL via the PR's status checks or the Netlify dashboard,
not by polling it directly.
