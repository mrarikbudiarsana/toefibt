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

const TEST_ID = '7b136ba6-3d28-4444-ae72-7263c635b382'; // TOEFL iBT Pre-Test

async function sync() {
  console.log(`Starting sync for Test: ${TEST_ID}`);

  const { data: sections, error: sErr } = await supabase
    .from('test_sections')
    .select('id, section_type')
    .eq('test_id', TEST_ID);
  
  if (sErr) throw sErr;

  const readingSec = sections.find(s => s.section_type === 'reading');
  const listeningSec = sections.find(s => s.section_type === 'listening');

  if (readingSec) await syncReading(readingSec.id);
  if (listeningSec) await syncListening(listeningSec.id);

  console.log('Sync complete!');
}

async function syncReading(sectionId) {
  console.log('Syncing Reading...');
  
  // Requirements for Module 1:
  // 10 items (1 C-test (10 questions) + 5 Daily + 5 Acad scored) + 15 unscored Academic = 25 items total?
  // Wait, the table says "Total Stage 1: 20 scored questions".
  // 10 (C-test) + 5 Daily + 5 Acad = 20 questions.
  // Plus 15 unscored questions = 35 questions total.
  // So we need: 1 C-test (10) + 5 Daily + 5 Acad + 15 Unscored Acad = 26 question items in the array.
  
  const { data: current, error: qErr } = await supabase
    .from('test_questions')
    .select('id, task_type, module, is_scored')
    .eq('section_id', sectionId)
    .eq('module', 'module1');
  
  if (qErr) throw qErr;

  const dailyCount = current.filter(q => q.task_type === 'read_daily_life' && q.is_scored).length;
  const acadCount = current.filter(q => q.task_type === 'read_academic' && q.is_scored).length;
  const unscoredCount = current.filter(q => !q.is_scored).length;

  const toAdd = [];

  // Add 1 more Daily Life if needed (current has 4)
  if (dailyCount < 5) {
    for (let i = 0; i < (5 - dailyCount); i++) {
      toAdd.push({
        section_id: sectionId,
        module: 'module1',
        task_type: 'read_daily_life',
        is_scored: true,
        prompt: 'Which information is provided in the document?',
        options: ['Store hours', 'Pricing', 'Location', 'Return policy'],
        correct_answer: 'A',
        group_id: '0', // Use first passage
        order_index: 10 + i
      });
    }
  }

  // Add unscored questions (current has 0 unscored in check_full_db output)
  if (unscoredCount < 15) {
    for (let i = 0; i < (15 - unscoredCount); i++) {
      toAdd.push({
        section_id: sectionId,
        module: 'module1',
        task_type: 'read_academic',
        is_scored: false,
        prompt: `[Trial Question ${i+1}] According to the text, what happened during the trial period?`,
        options: ['Success', 'Failure', 'No change', 'Inconclusive'],
        correct_answer: 'A',
        group_id: '0',
        order_index: 20 + i
      });
    }
  }

  if (toAdd.length > 0) {
    console.log(`Adding ${toAdd.length} reading questions...`);
    const { error: insErr } = await supabase.from('test_questions').insert(toAdd);
    if (insErr) throw insErr;
  }
}

async function syncListening(sectionId) {
  console.log('Syncing Listening...');
  
  // Module 1 Requirements:
  // 8 Choose Response + 4 Conversation + 4 Announcement + 4 Academic Talk = 20 scored.
  // Plus 12 unscored = 32 questions total.
  
  const { data: current, error: qErr } = await supabase
    .from('test_questions')
    .select('id, task_type, module, is_scored')
    .eq('section_id', sectionId)
    .eq('module', 'module1');
  
  if (qErr) throw qErr;

  const counts = {
    listen_choose_response: 0,
    listen_conversation: 0,
    listen_announcement: 0,
    listen_academic_talk: 0,
    unscored: 0
  };

  current.forEach(q => {
    if (!q.is_scored) counts.unscored++;
    else if (counts[q.task_type] !== undefined) counts[q.task_type]++;
  });

  const toAdd = [];
  const targets = {
    listen_choose_response: 8,
    listen_conversation: 4,
    listen_announcement: 4,
    listen_academic_talk: 4,
    unscored: 12
  };

  for (const [type, target] of Object.entries(targets)) {
    const diff = target - counts[type];
    for (let i = 0; i < diff; i++) {
       toAdd.push({
         section_id: sectionId,
         module: 'module1',
         task_type: type === 'unscored' ? 'listen_academic_talk' : type,
         is_scored: type !== 'unscored',
         prompt: type === 'listen_choose_response' ? '' : 'What is the speaker discussing?',
         options: ['Option A', 'Option B', 'Option C', 'Option D'],
         correct_answer: 'A',
         audio_url: 'https://example.com/audio.mp3',
         order_index: 100 + toAdd.length
       });
    }
  }

  if (toAdd.length > 0) {
    console.log(`Adding ${toAdd.length} listening questions...`);
    const { error: insErr } = await supabase.from('test_questions').insert(toAdd);
    if (insErr) throw insErr;
  }
}

sync().catch(console.error);
