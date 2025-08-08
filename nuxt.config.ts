// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  supabase: {
    redirect: false,
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    supabaseServiceKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
    // Public keys (exposed to client-side)  
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
    },
  },
  // Configure server-side rendering and API routes
  nitro: {
    storage: {
      // Expose CSV assets from project into Nitro storage
      'recipes:': {
        driver: 'fs',
        base: './assets'
      }
    },
    routeRules: {
      // Cache market data for 5 minutes
      '/api/markets/**': { 
        cors: true, 
        headers: { 'cache-control': 's-maxage=300' } 
      },
      // Cache regions for 1 hour
      '/api/regions': { 
        cors: true, 
        headers: { 'cache-control': 's-maxage=3600' } 
      },
      // Cache type info for 1 day
      '/api/types/**': { 
        cors: true, 
        headers: { 'cache-control': 's-maxage=86400' } 
      },
      '/api/recipes/**': {
        cors: true,
        headers: { 'cache-control': 's-maxage=86400' }
      }
    },
    prerender: {
      crawlLinks: false
    }
  },
  // Add global CSS and other configurations
  css: [],
  // Configure auto-imports for composables
  imports: {
    dirs: ['composables/**']
  }
})