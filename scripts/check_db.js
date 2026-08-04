const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
// Use Anon key to see what RLS allows, but since we are running a script we can't act as a user easily.
// Wait, we DO have a SUPABASE_SERVICE_ROLE_KEY if we check properly, but it's not in .env.local!
// Let me use REST API or just check if cards exist.
const supabase = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDb() {
  const { count: cardsCount } = await supabase.from('cards').select('*', { count: 'exact', head: true });
  const { count: notesCount } = await supabase.from('notes').select('*', { count: 'exact', head: true });
  const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
  
  console.log(`Cards: ${cardsCount}, Notes: ${notesCount}, Subjects: ${subjectsCount}`);
}

checkDb();
