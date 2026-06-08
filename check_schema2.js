const fs = require('fs');
const https = require('https');

async function fetchSchema() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, val] = line.split('=');
      env[key.trim()] = val.trim().replace(/['"]/g, '');
    }
  });

  const url = env['NEXT_PUBLIC_SUPABASE_URL'] + '/rest/v1/?apikey=' + env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const swagger = JSON.parse(data);
      const expenses = swagger.definitions.expenses.properties;
      console.log("Expense columns:", Object.keys(expenses));
      
      if (swagger.definitions.expense_attachments) {
        console.log("Expense attachments exists");
      } else {
        console.log("Expense attachments DOES NOT EXIST");
      }
    });
  });
}

fetchSchema();
