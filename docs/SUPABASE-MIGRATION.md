# Supabase Auth Helpers Migration

This document explains the migration from `@supabase/auth-helpers-nextjs` to `@supabase/ssr` in our project.

## Background

- Supabase has deprecated `@supabase/auth-helpers-nextjs` in favor of `@supabase/ssr`
- The new package provides improved support for App Router and server components
- Our project was experiencing deployment failures due to dependency issues

## Changes Made

1. Created a utility helper file at `src/lib/supabase/server-utils.ts` with:
   - `createSupabaseRouteHandlerClient()` - Creates a Supabase client for API routes
   - `getAllCookies()` - Helper to safely access cookies in both async and sync contexts

2. Updated all API routes to use the new helper functions:
   - Replaced imports from `@supabase/auth-helpers-nextjs` with imports from our helper
   - Updated client creation to use the new pattern
   - Fixed cookie handling to work with both async and sync cookie API

3. Created a migration script at `scripts/supabase-migrate.js` to automate the migration

## How to Use the New API

Before:
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  // ...
}
```

After:
```typescript
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server-utils';

export async function GET() {
  const supabase = createSupabaseRouteHandlerClient();
  // ...
}
```

## Benefits

- Improved compatibility with the latest Next.js features
- Better cookie handling across different contexts
- Simplified API route code
- Resolved deployment errors

## Troubleshooting

If you encounter any issues:

1. Make sure you're using the helper from `@/lib/supabase/server-utils`
2. Check that you've removed the old imports
3. Verify that your cookie handling is compatible with the new API

## References

- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing) 