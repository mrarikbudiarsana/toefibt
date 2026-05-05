
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStorage() {
  console.log('Checking storage buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  console.log('Current buckets:', buckets.map(b => b.name));

  const recordingsBucket = buckets.find(b => b.name === 'recordings');

  if (!recordingsBucket) {
    console.log('Bucket "recordings" not found. Creating it...');
    const { data, error: createError } = await supabase.storage.createBucket('recordings', {
      public: true,
      allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mpeg'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
    } else {
      console.log('Bucket "recordings" created successfully.');
    }
  } else {
    console.log('Bucket "recordings" already exists.');
  }

  // Also check/create policies if possible via API (usually needs SQL for RLS, but we can try)
  // Actually, bucket policies are better set via SQL as seen in schema.sql
  console.log('Note: Ensure RLS policies are set in Supabase SQL editor as per schema.sql:');
  console.log(`
    create policy "Anyone can upload recordings" on storage.objects
      for insert with check (bucket_id = 'recordings' and auth.uid() is not null);
    
    create policy "Recordings are publicly readable" on storage.objects
      for select using (bucket_id = 'recordings');
  `);
}

fixStorage();
