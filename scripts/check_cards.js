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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCards() {
  const { data: cards, error } = await supabase
    .from('cards')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Error fetching cards:', error);
    return;
  }
  
  console.log(`Found ${cards.length} cards`);
  cards.forEach(c => {
    console.log(`Card: id=${c.id}, note_id=${c.note_id}, box=${c.box}, due=${c.due}, tier=${c.tier}`);
  });
}

checkCards();
