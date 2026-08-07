import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Proves the security boundary the note server actions actually rely on.
// getNote, updateNoteContent, updateNoteTitle and createClozeCard
// (src/app/notes/[id]/actions.ts) do no app-level ownership check at all -
// they pass the note id straight through to Supabase and let the "own
// notes" / "own cards" row level security policies (supabase/schema.sql)
// decide. That is a deliberate choice, not an oversight: both an app-level
// check and RLS would read the same tables through the same policy, so the
// second copy adds a place to forget rather than a real second layer. It is
// only defensible if RLS genuinely blocks cross-user access, which is what
// this test pins down.
//
// Talks to the real Supabase project (there is no local instance in this
// repo) using ephemeral users created and deleted here.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Email confirmation is on for this project (see src/app/login/actions.ts),
// so a plain signUp never yields a session in an unattended test. The admin
// API creates the account already confirmed.
const canRun = Boolean(url && anonKey && serviceKey);

// In CI, missing credentials are a failure, not a reason to quietly pass:
// a security test that skips itself is indistinguishable from one that
// proves nothing, and this is the only thing standing behind actions that
// do no ownership check of their own. Locally it skips, so a fresh clone
// without a service role key still gets a green `npm test`.
if (!canRun && process.env.CI) {
  throw new Error(
    'RLS test cannot run: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY as repository secrets (Settings -> Secrets and variables -> Actions).'
  );
}

describe.skipIf(!canRun)('notes/cards row level security', () => {
  const password = 'test-password-that-is-long-enough-1';
  const stamp = Date.now();
  const emailA = `rls-a-${stamp}@quadencode-test.invalid`;
  const emailB = `rls-b-${stamp}@quadencode-test.invalid`;

  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId: string;
  let userBId: string;
  let noteAId: string;
  let subjectAId: string;

  async function signInAs(email: string) {
    const client = createClient(url!, anonKey!);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);
    return client;
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: a, error: aErr } = await admin.auth.admin.createUser({
      email: emailA, password, email_confirm: true,
    });
    if (aErr) throw new Error(`Could not create user A: ${aErr.message}`);
    userAId = a.user.id;

    const { data: b, error: bErr } = await admin.auth.admin.createUser({
      email: emailB, password, email_confirm: true,
    });
    if (bErr) throw new Error(`Could not create user B: ${bErr.message}`);
    userBId = b.user.id;

    clientA = await signInAs(emailA);
    clientB = await signInAs(emailB);

    // User A's own subject + note, created through A's own RLS-scoped
    // client, so this doubles as a check that the owner path works.
    const { data: subject, error: subjErr } = await clientA
      .from('subjects')
      .insert({ user_id: userAId, name: 'RLS test subject', slug: `rls-test-${stamp}` })
      .select('id')
      .single();
    if (subjErr) throw new Error(`User A could not create their own subject: ${subjErr.message}`);
    subjectAId = subject.id;

    const { data: note, error: noteErr } = await clientA
      .from('notes')
      .insert({ subject_id: subjectAId, title: 'Private note', body_md: 'secret body' })
      .select('id')
      .single();
    if (noteErr) throw new Error(`User A could not create their own note: ${noteErr.message}`);
    noteAId = note.id;
  }, 30_000);

  afterAll(async () => {
    // Deleting the auth users cascades through subjects -> notes -> cards
    // (see the FKs in supabase/schema.sql), so this cleans up every row the
    // test made, not just the accounts.
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  }, 30_000);

  it("does not let user B read user A's note by id", async () => {
    const { data, error } = await clientB
      .from('notes')
      .select('id, body_md')
      .eq('id', noteAId);

    // A blocked read is an empty result, not an error - the row is filtered
    // out before the query sees it. Either way, no leaked body_md.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does not let user B update user A's note", async () => {
    const { data } = await clientB
      .from('notes')
      .update({ body_md: 'overwritten by user B' })
      .eq('id', noteAId)
      .select('id');

    // Zero rows matched: RLS filtered the row out of the UPDATE's scope.
    expect(data ?? []).toEqual([]);

    // And the original content is still intact when the owner reads it back.
    const { data: stillMine } = await clientA
      .from('notes')
      .select('body_md')
      .eq('id', noteAId)
      .single();
    expect(stillMine?.body_md).toBe('secret body');
  });

  it("does not let user B insert a card onto user A's note", async () => {
    const { error } = await clientB.from('cards').insert({
      note_id: noteAId, line: 0, tier: 'imported', type: 'vocab',
      prompt: 'injected', answer: 'injected',
    });

    // An insert that fails the WITH CHECK clause is a hard error (unlike a
    // filtered select/update), so this one does surface as a rejection.
    expect(error).not.toBeNull();

    const { data: cards } = await clientA
      .from('cards')
      .select('id')
      .eq('note_id', noteAId);
    expect(cards ?? []).toEqual([]);
  });

  it("lets user A read and update their own note", async () => {
    const { data: read } = await clientA
      .from('notes')
      .select('body_md')
      .eq('id', noteAId)
      .single();
    expect(read?.body_md).toBe('secret body');

    const { data: updated } = await clientA
      .from('notes')
      .update({ body_md: 'updated by owner' })
      .eq('id', noteAId)
      .select('body_md')
      .single();
    expect(updated?.body_md).toBe('updated by owner');
  });
});
