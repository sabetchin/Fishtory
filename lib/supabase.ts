import { createBrowserClient } from '@supabase/ssr'

const FALLBACK_URL = 'https://gxqhdqampmfxuahiiign.supabase.co'
const FALLBACK_KEY = 'sb_publishable__t4cA-UTDNL4g2t_7M6neQ_181oXxFF'

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Stricter check for Vercel/environment variables
const isValid = (val: any) => {
  if (!val) return false
  const s = String(val).trim()
  return s !== 'undefined' && s !== 'null' && s !== ''
}

// Final resolved values
export const supabaseUrl = isValid(envUrl) ? envUrl! : FALLBACK_URL
export const supabaseAnonKey = isValid(envKey) ? envKey! : FALLBACK_KEY

export const isSupabaseConfigured = isValid(supabaseUrl) && isValid(supabaseAnonKey)

if (typeof window !== 'undefined') {
  console.log('--- FISHTORY DIAGNOSTICS ---')
  console.log('Timestamp:', new Date().toISOString())
  
  const source = isValid(envUrl) ? 'Environment Variables' : 'Hardcoded Fallback'
  
  console.log('Supabase Config Check:', {
    isConfigured: isSupabaseConfigured,
    source,
    url: { 
      present: isValid(supabaseUrl), 
      type: typeof supabaseUrl,
      length: supabaseUrl?.length || 0
    },
    key: { 
      present: isValid(supabaseAnonKey), 
      type: typeof supabaseAnonKey,
      length: supabaseAnonKey?.length || 0
    }
  })
  
  // Custom check for specific env var presence since Object.keys(process.env) fails on client
  console.log('Detected Env Vars Status:', {
    NEXT_PUBLIC_SUPABASE_URL: isValid(envUrl) ? 'Detected' : 'Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: isValid(envKey) ? 'Detected' : 'Missing'
  })
  console.log('---------------------------')
}

const createResilientClient = () => {
  if (isSupabaseConfigured) {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  
  // Return a proxy that throws a clear error if any property (like .auth) is accessed
  return new Proxy({} as any, {
    get: (_, prop) => {
      const msg = `Supabase Configuration Missing: Cannot access ".${String(prop)}" because the client is not configured correctly. ` +
                 `If you are deploying on Vercel, ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Project Settings. ` +
                 `If running locally, check your .env.local file and restart your development server.`
      console.error(msg)
      throw new Error(msg)
    }
  })
}

export const supabase = createResilientClient()
