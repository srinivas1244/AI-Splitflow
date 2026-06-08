const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchema() {
  // Use user's env vars from .env.local if possible
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, val] = line.split('=');
      env[key.trim()] = val.trim().replace(/['"]/g, '');
    }
  });

  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("Missing env vars");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('expenses').select('*').limit(1);
  
  if (error) {
    console.log("Error:", error);
  } else if (data && data.length > 0) {
    console.log("Expense Columns:", Object.keys(data[0]));
  } else {
    console.log("No data, but query succeeded. Try inserting a blank one to see error?");
    const { error: insertError } = await supabase.from('expenses').insert({ title: 'test', amount: 10, paid_by: '00000000-0000-0000-0000-000000000000', created_by: '00000000-0000-0000-0000-000000000000' });
    console.log("Insert error check:", insertError);
  }
}

checkSchema();
