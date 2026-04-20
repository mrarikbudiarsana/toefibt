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
    console.log(`\nTest: ${test.title} (${test.id})`);
    
    const { data: sections, error: sErr } = await supabase
      .from('test_sections')
      .select('id, section_type')
      .eq('test_id', test.id);
    if (sErr) { console.error(sErr); continue; }

    for (const section of sections) {
      console.log(`  Section: ${section.section_type}`);
      
      const { data: questions, error: qErr } = await supabase
        .from('test_questions')
        .select('id, module, task_type, order_index')
        .eq('section_id', section.id)
        .order('module, order_index');
      if (qErr) { console.error(qErr); continue; }
      
      const modules = ['module1', 'module2_easy', 'module2_hard', 'module2_both'];
      modules.forEach(mod => {
        const modQuestions = questions.filter(q => q.module === mod);
        if (modQuestions.length > 0) {
          console.log(`    Module: ${mod} (${modQuestions.length} items)`);
          const counts = modQuestions.reduce((acc, q) => {
            acc[q.task_type] = (acc[q.task_type] || 0) + 1;
            return acc;
          }, {});
          Object.entries(counts).forEach(([type, count]) => {
            console.log(`      - ${type}: ${count}`);
          });
        }
      });
    }
  }
}

checkQuestions();
