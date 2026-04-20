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

async function checkAssignment() {
  const assignmentId = '682398d0-7dc3-4f3f-86a5-c51c142228ba';
  const { data, error } = await supabase
    .from('test_assignments')
    .select('test_id, tests(title)')
    .eq('id', assignmentId)
    .single();
  
  if (error) { console.error(error); return; }
  console.log(`Assignment ${assignmentId} is for Test: ${data.test_id} (${data.tests.title})`);
  
  // Check questions for this test's Reading Module 1
  const { data: sections, error: sErr } = await supabase
    .from('test_sections')
    .select('id, reading_passage')
    .eq('test_id', data.test_id)
    .eq('section_type', 'reading')
    .single();
  
  if (sErr) { console.error(sErr); return; }
  console.log(`Reading Section ID: ${sections.id}`);
  console.log(`Reading Passage column length: ${sections.reading_passage?.length ?? 0}`);
  
  const { data: questions, error: qErr } = await supabase
    .from('test_questions')
    .select('id, task_type, module, is_scored, order_index')
    .eq('section_id', sections.id)
    .order('order_index');
  
  if (qErr) { console.error(qErr); return; }
  
  const mod1 = questions.filter(q => q.module === 'module1');
  console.log(`Module 1 items: ${mod1.length}`);
  mod1.forEach((q, i) => {
    console.log(`  ${i+1}. ${q.task_type} (Scored: ${q.is_scored}, order: ${q.order_index})`);
  });
}

checkAssignment();
