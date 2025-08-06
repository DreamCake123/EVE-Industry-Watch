// Environment configuration check
export function checkEnvironment() {
  const config = useRuntimeConfig()
  
  if (!config.public.supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set')
  }
  
  if (!config.public.supabaseAnonKey) {
    throw new Error('SUPABASE_KEY environment variable is not set')
  }
  
  return {
    supabaseUrl: config.public.supabaseUrl,
    supabaseKey: config.public.supabaseAnonKey
  }
}
