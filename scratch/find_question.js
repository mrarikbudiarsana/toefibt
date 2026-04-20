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

async function findQuestion() {
  const { data, error } = await supabase
    .from('test_questions')
    .select('id, group_id, prompt, task_type')
    .ilike('prompt', '%earliest time of day%');
  
  if (error) { console.error(error); return; }
  console.log('Matching questions:');
  data.forEach(q => {
    console.log(`ID: ${q.id}, task_type: ${q.task_type}, group_id: ${q.group_id}, prompt: ${q.prompt}`);
  });
}

findQuestion();
