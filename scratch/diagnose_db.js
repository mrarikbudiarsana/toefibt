
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
  console.log('--- Database Diagnosis ---');
  
  // 1. Check student_profiles count
  const { count: profileCount, error: profileErr } = await supabase
    .from('student_profiles')
    .select('*', { count: 'exact', head: true });
  
  if (profileErr) {
    console.error('Error fetching student_profiles:', profileErr);
  } else {
    console.log(`Total rows in student_profiles: ${profileCount}`);
  }

  // 2. Check auth.users count (via service role)
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  
  if (authErr) {
    console.error('Error listing auth users:', authErr);
  } else {
    const users = authData.users;
    console.log(`Total users in auth.users: ${users.length}`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.user_metadata?.role}`);
    });
  }

  // 3. Find missing syncs
  if (!authErr && !profileErr) {
    const { data: profiles } = await supabase.from('student_profiles').select('id');
    const profileIds = new Set(profiles.map(p => p.id));
    
    console.log('\n--- Sync Issues ---');
    const missing = authData.users.filter(u => !profileIds.has(u.id));
    if (missing.length > 0) {
      console.log(`Found ${missing.length} users missing from student_profiles:`);
      missing.forEach(u => console.log(`  - ${u.email} (${u.id})`));
    } else {
      console.log('All auth users have entries in student_profiles.');
    }
  }
}

diagnose();
