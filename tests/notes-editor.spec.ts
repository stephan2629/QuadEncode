import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceKey);

// The main path through the note editor: type card syntax, let the
// debounced autosave fire on its own, and confirm the card was created
// exactly once and the text survived a reload. Everything here is
// deliberately driven through the real UI - no seeded session, no direct
// state manipulation - because the thing under test is the save pipeline,
// and stubbing any part of it would test the stub.
//
// Needs a signed-in user, which needs the service role key: email
// confirmation is on for this project (src/app/login/actions.ts), so a
// plain signUp never yields a session unattended. Fails rather than skips
// in CI for the same reason the RLS test does (src/lib/notes-rls.test.ts).
if (!canRun && process.env.CI) {
  throw new Error(
    'Note editor e2e cannot run: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY as repository secrets.'
  );
}

// Serial, overriding the config's fullyParallel: both tests work on the
// one note created in beforeAll, and the card-count assertion in the first
// test would see the second test's ten pairs if they ran side by side.
// (Parallel also runs beforeAll once per worker, quietly creating a second
// throwaway user for no reason.)
test.describe.configure({ mode: 'serial' });

test.describe('Note editor', () => {
  test.skip(!canRun, 'no Supabase credentials available');

  const password = 'test-password-that-is-long-enough-1';
  let admin: SupabaseClient;
  let email: string;
  let userId: string;
  let noteId: string;

  test.beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    const stamp = Date.now();
    email = `e2e-note-${stamp}@quadencode-test.invalid`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr) throw new Error(`Could not create test user: ${createErr.message}`);
    userId = created.user.id;

    // Subject and note are made through the user's own client so they pass
    // the same RLS policies the app runs under, rather than being inserted
    // with the service key into a state a real user could never produce.
    const asUser = createClient(url!, anonKey!);
    const { error: signInErr } = await asUser.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`Could not sign in test user: ${signInErr.message}`);

    const { data: subject, error: subjErr } = await asUser
      .from('subjects')
      .insert({ user_id: userId, name: 'E2E subject', slug: `e2e-subject-${stamp}` })
      .select('id')
      .single();
    if (subjErr) throw new Error(`Could not create subject: ${subjErr.message}`);

    const { data: note, error: noteErr } = await asUser
      .from('notes')
      .insert({ subject_id: subject.id, title: 'E2E note', body_md: '' })
      .select('id')
      .single();
    if (noteErr) throw new Error(`Could not create note: ${noteErr.message}`);
    noteId = note.id;
  });

  test.afterAll(async () => {
    // Cascades through subjects -> notes -> cards via the FKs in
    // supabase/schema.sql, so this removes every row the test created.
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('autosave persists a typed pair without creating cards before the ten-pair minimum', async ({ page }) => {
    // Real sign-in through the real form. The app redirects to /dashboard
    // on success, which is also the signal that the session cookie is set.
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/notes/${noteId}`);
    const editor = page.getByRole('textbox', { name: 'Note content' });
    await expect(editor).toBeVisible();

    // A fresh note holds no batch yet, so Practice and Quiz are absent
    // entirely - not disabled, not empty states (CLAUDE.md section 3).
    await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Practice' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveCount(0);

    await editor.fill('**Vocab:** Photosynthesis\n**Def:** How plants turn light into chemical energy.');

    // Nothing is clicked from here on: the debounced autosave must persist
    // the note, while the ten-pair rule keeps study cards absent for now.
    await expect
      .poll(async () => {
        const { data } = await admin.from('notes').select('body_md').eq('id', noteId).single();
        return data?.body_md.includes('Photosynthesis') ?? false;
      }, {
        message: 'autosave should persist the typed pair',
        timeout: 15_000,
      })
      .toBe(true);

    // Give any second (racing) save a chance to land before asserting the
    // count held - asserting immediately would pass even if a duplicate
    // were about to be written a moment later.
    await page.waitForTimeout(2_000);
    const { data: cardsAfter } = await admin
      .from('cards')
      .select('id, prompt, line')
      .eq('note_id', noteId);
    expect(cardsAfter).toHaveLength(0);

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Note content' }))
      .toHaveValue(/Photosynthesis/);
  });

  test('Practice and Quiz tabs appear only once the note holds ten pairs', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/notes/${noteId}`);
    const editor = page.getByRole('textbox', { name: 'Note content' });
    await expect(editor).toBeVisible();

    const pair = (i: number) => `**Vocab:** Term${i}\n**Def:** Definition ${i}`;

    // Nine pairs is below the threshold: still just the Notes tab.
    await editor.fill(Array.from({ length: 9 }, (_, i) => pair(i)).join('\n\n'));
    await expect(page.getByRole('tab', { name: 'Practice' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveCount(0);

    // The tenth reveals both, derived from the live editor content rather
    // than from saved cards, so it happens as the pair is typed.
    await editor.fill(Array.from({ length: 10 }, (_, i) => pair(i)).join('\n\n'));
    await expect(page.getByRole('tab', { name: 'Practice' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Quiz' })).toBeVisible();

    // And they survive a reload, i.e. the content that revealed them was
    // actually saved rather than only existing in client state.
    await expect
      .poll(async () => {
        const { data } = await admin.from('notes').select('body_md').eq('id', noteId).single();
        return data?.body_md?.includes('Term9') ?? false;
      }, { message: 'autosave should persist the tenth pair', timeout: 15_000 })
      .toBe(true);

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Practice' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Quiz' })).toBeVisible();

    // The open tab is URL state (?tab=quiz), so a refresh renders it
    // selected from the server on the first paint - no flash of the Notes
    // tab while client state catches up. `waitUntil: 'commit'` checks the
    // very first painted markup rather than the settled page.
    await page.getByRole('tab', { name: 'Quiz' }).click();
    await expect(page).toHaveURL(/[?&]tab=quiz/);
    await page.reload({ waitUntil: 'commit' });
    await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveAttribute('aria-selected', 'true');
  });
});
