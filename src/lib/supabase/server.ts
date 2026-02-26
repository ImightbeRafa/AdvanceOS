import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — can be ignored
          }
        },
      },
    }
  )
}

export const getAuthProfile = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, supabase }
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return { user, profile, supabase }
})

export async function createServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
