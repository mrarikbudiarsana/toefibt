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

async function findAssignment() {
  const { data, error } = await supabase
    .from('test_assignments')
    .select('id')
    .limit(1);
  if (error) { console.error(error); return; }
  console.log(`Assignment ID: ${data[0].id}`);
}

findAssignment();
