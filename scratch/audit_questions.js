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

async function checkAllReadingQuestions() {
  const testId = '7b136ba6-3d28-4444-ae72-7263c635b382';
  
  // Get section
  const { data: section, error: sErr } = await supabase
    .from('test_sections')
    .select('id')
    .eq('test_id', testId)
    .eq('section_type', 'reading')
    .single();
  
  if (sErr) { console.error(sErr); return; }

  // Get all questions
  const { data: questions, error: qErr } = await supabase
    .from('test_questions')
    .select('id, module, task_type, is_scored, prompt, order_index')
    .eq('section_id', section.id)
    .order('order_index');
    
  if (qErr) { console.error(qErr); return; }

  console.log(`Total questions in Reading section: ${questions.length}`);
  questions.forEach((q, i) => {
    console.log(`[${i+1}] Order: ${q.order_index}, Module: ${q.module}, Scored: ${q.is_scored}, Type: ${q.task_type}, Prompt: ${q.prompt.substring(0, 30)}...`);
  });
}

checkAllReadingQuestions();
