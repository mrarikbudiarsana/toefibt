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

async function checkQuestions() {
  const { data: tests, error: tErr } = await supabase.from('tests').select('id, title');
  if (tErr) { console.error(tErr); return; }
  
  for (const test of tests) {
    console.log(`Test: ${test.title} (${test.id})`);
    const { data: sections, error: sErr } = await supabase
      .from('test_sections')
      .select('id, section_type')
      .eq('test_id', test.id)
      .eq('section_type', 'reading');
    if (sErr) { console.error(sErr); continue; }

    for (const section of sections) {
      const { data: questions, error: qErr } = await supabase
        .from('test_questions')
        .select('id, module, task_type, order_index')
        .eq('section_id', section.id)
        .eq('module', 'module1')
        .order('order_index');
      if (qErr) { console.error(qErr); continue; }
      
      console.log(`  Reading Module 1: ${questions.length} question items`);
      questions.forEach((q, i) => {
        console.log(`    ${i+1}. ${q.task_type} (ID: ${q.id})`);
      });
    }
  }
}

checkQuestions();
