const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchema() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, ...rest] = line.split('=');
      env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
    }
  });

  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { error } = await supabase.from('expenses').insert({ 
    title: 'test', 
    amount: 10, 
    paid_by: '00000000-0000-0000-0000-000000000000', 
    created_by: '00000000-0000-0000-0000-000000000000',
    category: 'other',
    split_type: 'equal',
    date: '2023-01-01'
  });
  
  console.log("Insert with category, split_type, date error:", error);
}

checkSchema();
