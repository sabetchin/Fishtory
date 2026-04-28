# Supabase Keys Guide: Anon vs Service Role

## Overview

Supabase provides two types of API keys for different use cases. Understanding when to use each is critical for security and functionality.

## Anon Key (Public Key)

### What It Is
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env` file
- Intended for client-side use (browser, mobile apps)
- Can be safely exposed in frontend code
- Has restricted permissions based on RLS policies

### When to Use
- **Client-side components** (React components, hooks)
- **User authentication** (sign up, sign in, sign out)
- **User-specific data operations** (fetching user's own data)
- **Public data** (data accessible to all authenticated users)

### Security Model
- Respects Row Level Security (RLS) policies
- Users can only access data permitted by RLS
- Cannot bypass security rules
- Safe to include in client bundles

### Example Usage
```typescript
// lib/supabase.ts (client-side)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```typescript
// components/fisherman-registry.tsx
import { supabase } from "@/lib/supabase"

// This respects RLS policies
const { data } = await supabase
  .from('fishermen_profiles')
  .select('*')
```

## Service Role Key (Admin Key)

### What It Is
- Found in Supabase Dashboard → Project Settings → API
- Intended for server-side use only
- **NEVER** expose in client-side code
- Bypasses RLS policies (full admin access)

### When to Use
- **Server-side operations** (API routes, Server Actions, Edge Functions)
- **Admin operations** that need full database access
- **Background jobs** and cron tasks
- **Data migrations** and bulk operations
- **Server-to-server** integrations

### Security Model
- **Bypasses RLS completely**
- Has full read/write access to all tables
- Can perform any database operation
- Must be kept secret (server-side only)

### Example Usage
```typescript
// lib/supabase-server.ts (server-side)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Server env var

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
```

```typescript
// app/actions/export-reports.ts (Server Action)
import { supabaseAdmin } from "@/lib/supabase-server"

// This bypasses RLS - admin can access all data
const { data } = await supabaseAdmin
  .from('fishermen_profiles')
  .select('*')
```

## For Your Admin Panel

### Option 1: Use Anon Key with Proper RLS (Recommended)

**Pros:**
- More secure
- Follows Supabase best practices
- User authentication is enforced
- Audit trail of who accessed what

**Cons:**
- Requires proper RLS policy setup
- More complex to implement

**Implementation:**
```typescript
// Use existing client-side supabase with anon key
import { supabase } from "@/lib/supabase"

// Ensure RLS policies allow admin access
// See SUPABASE_RLS_SETUP.md for policy examples
```

### Option 2: Use Service Role Key (Simpler but Less Secure)

**Pros:**
- Simpler to implement
- No RLS policy setup needed
- Immediate access to all data

**Cons:**
- Security risk if leaked
- No user-level access control
- Bypasses all security policies

**Implementation:**
```typescript
// Create server-side admin client
// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Use in Server Actions only
// app/actions/admin-actions.ts
import { supabaseAdmin } from "@/lib/supabase-server"
```

## Environment Variables Setup

### For Anon Key (Client-Side)
```env
# .env.local (can be committed if public)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### For Service Role Key (Server-Side)
```env
# .env.local (NEVER commit this)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### For Vercel Deployment
```bash
# Set in Vercel Project Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next.js App Router Specifics

### Client Components (use Anon Key)
```typescript
"use client"

import { supabase } from "@/lib/supabase"

export function FishermanRegistry() {
  // Uses anon key, respects RLS
  const fetchFishermen = async () => {
    const { data } = await supabase.from('fishermen_profiles').select('*')
  }
}
```

### Server Components (Can Use Either)
```typescript
// Server component with anon key (respects RLS)
import { supabase } from "@/lib/supabase"

export default async function AdminPage() {
  const { data } = await supabase.from('fishermen_profiles').select('*')
}

// Server component with service role (bypasses RLS)
import { supabaseAdmin } from "@/lib/supabase-server"

export default async function AdminPage() {
  const { data } = await supabaseAdmin.from('fishermen_profiles').select('*')
}
```

### Server Actions (Use Service Role for Admin)
```typescript
"use server"

import { supabaseAdmin } from "@/lib/supabase-server"

export async function exportRecentReports() {
  // Bypasses RLS for admin operations
  const { data } = await supabaseAdmin.from('reports').select('*')
}
```

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Always use anon key** for user-facing features
3. **Use service role only** in server-side code
4. **Implement proper RLS policies** instead of relying on service role
5. **Rotate keys** if they're accidentally exposed
6. **Use environment variables** for all keys
7. **Never commit** service role keys to git

## Common Mistakes

### ❌ Using Service Role in Client Component
```typescript
"use client"
import { createClient } from '@supabase/supabase-js'

// BAD: Service role exposed to browser
const supabase = createClient(url, serviceRoleKey)
```

### ❌ Hardcoding Keys
```typescript
// BAD: Keys in source code
const supabase = createClient('https://...', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
```

### ✅ Correct Approach
```typescript
// lib/supabase.ts (client)
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// lib/supabase-server.ts (server)
import { createClient } from '@supabase/supabase-js'
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## Recommendation for Your Project

**For the Fisherman Registry Admin Panel:**

1. **Short-term (Quick fix):** Use service role key in Server Actions
   - Create `lib/supabase-server.ts` with service role client
   - Use it in admin-specific Server Actions
   - Allows immediate access without RLS setup

2. **Long-term (Best practice):** Implement proper RLS policies
   - Use anon key in client components
   - Set up admin-specific RLS policies
   - More secure and maintainable

See `SUPABASE_RLS_SETUP.md` for RLS policy examples.
