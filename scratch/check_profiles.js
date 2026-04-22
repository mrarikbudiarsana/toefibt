
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv(path) {
  const content = fs.readFileSync(path, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join('=').trim();
    }
  });
  return env;
}

const env = loadEnv('.env.local');
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('--- student_profiles Contents ---');
  const { data, error } = await supabase.from('student_profiles').select('*');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

diagnose();
