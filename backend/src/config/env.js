import 'dotenv/config'
function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

export const env = {
  port: Number(process.env.PORT || 8080),

  geminiApiKey: process.env.GEMINI_API_KEY || '',  // optional — only needed for AI routes
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',

  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
}