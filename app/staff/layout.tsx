"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // If we're already on the login page, bypass the layout guard completely.
    // The middleware and login form itself handle the login logic.
    if (pathname === '/staff/login') {
        setIsAuthorized(true)
        setLoading(false)
        return
    }

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          if (isMounted) router.push("/staff/login")
          return
        }

        const role = session.user.user_metadata?.role
        if (role !== 'staff') {
           if (isMounted) router.push("/staff/login")
           return
        }

        if (isMounted) setIsAuthorized(true)
      } catch (err) {
        console.error("Auth check failed:", err)
        if (isMounted) router.push("/staff/login")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_OUT' && isMounted && pathname !== '/staff/login') {
        router.push("/staff/login")
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-800"></div>
          <p className="text-slate-600 font-medium animate-pulse">Verifying staff credentials...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return <>{children}</>
}
