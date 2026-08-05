// Screenshot capture for the visual-audit-refactor skill.
// Reuses @playwright/test (already a project dependency, see CLAUDE.md §22)
// instead of adding a headless-browser dependency.
//
// Usage: node scripts/capture-screenshot.js <url> <output-filename> [--viewport=390x844] [--auth-state=path.json]
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  const authArg = args.find((a) => a.startsWith('--auth-state='));
  const positional = args.filter((a) => !a.startsWith('--'));
  const [url, outputName = 'current-state.png'] = positional;
  const viewportArg = args.find((a) => a.startsWith('--viewport='));
  if (!url) {
    console.error('Usage: node scripts/capture-screenshot.js <url> <output-filename> [--viewport=WxH] [--auth-state=path.json]');
    process.exit(1);
  }

  let viewport = { width: 1440, height: 900 };
  const vp = viewportArg?.match(/^--viewport=(\d+)x(\d+)$/);
  if (vp) viewport = { width: Number(vp[1]), height: Number(vp[2]) };

  const outPath = path.join(__dirname, '..', '.claude', 'screenshots', outputName);
  const storageState = authArg ? authArg.slice('--auth-state='.length) : undefined;
  if (storageState && !fs.existsSync(storageState)) {
    console.error(`Auth state file not found: ${storageState}`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport, storageState });
    await page.goto(url, { waitUntil: 'networkidle' });
    // Scroll through the page (and any inner overflow-y-auto containers -
    // this app uses fixed-height app-shell layouts per the
    // ui-layout-formatting skill, e.g. dashboard/page.tsx's h-dvh
    // overflow-hidden shell with a scrolling inner div) so scroll-triggered
    // animations (Framer Motion `whileInView`) actually fire before the
    // shot, and so a fullPage screenshot afterward has something to capture
    // instead of clipping at the shell's fixed viewport height.
    await page.evaluate(async () => {
      const step = 400;
      const delay = () => new Promise((r) => setTimeout(r, 50));

      async function scrollThrough(scrollTo, getHeight) {
        let scrolled = 0;
        const height = getHeight();
        while (scrolled < height) {
          scrollTo(scrolled);
          scrolled += step;
          await delay();
        }
        scrollTo(0);
      }

      await scrollThrough(
        (y) => window.scrollTo(0, y),
        () => document.body.scrollHeight
      );

      const scrollers = Array.from(document.querySelectorAll('*')).filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4;
      });
      for (const el of scrollers) {
        await scrollThrough((y) => { el.scrollTop = y; }, () => el.scrollHeight);
      }

      // Un-clip fixed-height shells so fullPage can capture what was inside
      // the scroll container instead of just the viewport-sized slice. The
      // clipping element is often an *ancestor* of the scrollable one (e.g.
      // an `h-dvh overflow-hidden` shell wrapping an `overflow-y-auto`
      // child), so walk up to <body> un-clipping every node in the chain,
      // not just the scroller itself.
      const toUnclip = new Set([document.documentElement, document.body]);
      for (const el of scrollers) {
        let node = el;
        while (node && node !== document.body) {
          toUnclip.add(node);
          node = node.parentElement;
        }
      }
      for (const el of toUnclip) {
        el.style.overflow = 'visible';
        el.style.height = 'auto';
        el.style.maxHeight = 'none';
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot to ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
