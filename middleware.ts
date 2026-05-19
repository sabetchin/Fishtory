import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isGet = request.method === 'GET'
  const isServerAction = request.headers.has('next-action')

  if (isGet && !isServerAction) {
    const role = user?.user_metadata?.role

    // Protect /staff/* — only 'staff' role allowed
    if (request.nextUrl.pathname.startsWith('/staff') && !request.nextUrl.pathname.startsWith('/staff/login')) {
      if (!user) {
        return NextResponse.redirect(new URL('/staff/login', request.url))
      }
      if (role !== 'staff') {
        // Redirect admins to their portal, fishermen back to login
        if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
        return NextResponse.redirect(new URL('/staff/login', request.url))
      }
    }

    // Protect /admin/* — only 'admin' role allowed
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user || role !== 'admin') {
        return NextResponse.redirect(new URL('/login?role=admin', request.url))
      }
    }

    // Protect /dashboard — only 'fisherman' role allowed
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/complete-profile')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
      if (role === 'staff') return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
