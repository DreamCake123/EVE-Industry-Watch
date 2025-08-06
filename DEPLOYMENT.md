# Deployment Guide for Nuxt Hub

## Environment Variables Required

When deploying to Nuxt Hub, you need to set these environment variables in your project dashboard:

### Required Variables:
```
SUPABASE_URL = https://nhbhipvlydihqxprspvo.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYmhpcHZseWRpaHF4cHJzcHZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAxMDcyOSwiZXhwIjoyMDYzNTg2NzI5fQ.7Bdos5xKT-GFCKq-dD4rVV0vLRNyCeEyICIGv1xvoAQ
```

## Steps to Deploy:

1. **Go to your Nuxt Hub Dashboard**
   - Navigate to your project
   - Go to Settings → Environment Variables

2. **Add Environment Variables**
   - Add `SUPABASE_URL` with your Supabase project URL
   - Add `SUPABASE_KEY` with your Supabase anon/public key

3. **Deploy**
   - Push your code to the connected repository
   - The deployment should now work with access to Supabase

## Troubleshooting:

If you still get Supabase errors:
1. Verify the environment variables are exactly named `SUPABASE_URL` and `SUPABASE_KEY`
2. Check that the values don't have extra quotes or spaces
3. Make sure you're using the correct Supabase project URL and key
4. Try redeploying after setting the environment variables

## Local Development:

For local development, the `.env` file will be used automatically.
