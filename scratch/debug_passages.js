const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPassages() {
  const testId = '7b136ba6-3d28-4444-ae72-7263c635b382';
  const { data: section, error } = await supabase
    .from('test_sections')
    .select('reading_passage')
    .eq('test_id', testId)
    .eq('section_type', 'reading')
    .single();
  
  if (error) { console.error(error); return; }
  console.log('Reading Passage content:');
  console.log(section.reading_passage);
  
  try {
    const parsed = JSON.parse(section.reading_passage);
    console.log(`Parsed as JSON array of length: ${parsed.length}`);
    parsed.forEach((p, i) => console.log(`Passage ${i}: ${p.substring(0, 50)}...`));
  } catch (e) {
    console.log('Not valid JSON or not an array.');
  }
}

checkPassages();
