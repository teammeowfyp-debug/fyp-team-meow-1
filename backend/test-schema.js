const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zptjrpifaxheoydxasei.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdGpycGlmYXhoZW95ZHhhc2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDg3NzMsImV4cCI6MjA4NTcyNDc3M30.U9ElnXr-uwS3u0xKU4u6sekJoC9Hrn3Ffj_aewA92-U');
supabase.from('clients').select('*').limit(1).then(res => {
  if (res.data && res.data.length > 0) {
    console.log(Object.keys(res.data[0]));
  } else {
    console.log("No data found or error:", res.error);
  }
}).catch(console.error);
