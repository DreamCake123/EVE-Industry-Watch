// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  supabase:{
    redirect: false
  },
  publicRuntimeConfig: {
    supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  },
  // Configure server-side rendering and API routes
  nitro: {
    experimental: {
      wasm: true
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
      }
    }
  },
  // Add global CSS and other configurations
  css: [],
  // Configure auto-imports for composables
  imports: {
    dirs: ['composables/**']
  }
})
