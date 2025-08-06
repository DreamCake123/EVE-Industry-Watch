export default defineNuxtPlugin(() => {
  // Only run on client-side to avoid SSR issues
  if (process.client) {
    const config = useRuntimeConfig()
    
    console.log('Environment check:')
    console.log('Supabase URL:', config.public.supabaseUrl ? '✓ Set' : '✗ Missing')
    console.log('Supabase Key:', config.public.supabaseAnonKey ? '✓ Set' : '✗ Missing')
    
    if (!config.public.supabaseUrl) {
      console.error('❌ SUPABASE_URL is not configured')
    }
    
    if (!config.public.supabaseAnonKey) {
      console.error('❌ SUPABASE_KEY is not configured')
    }
  }
})
