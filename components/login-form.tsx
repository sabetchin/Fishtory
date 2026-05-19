"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Anchor, AlertCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { isSupabaseConfigured } from "@/lib/supabase"

export function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const role = searchParams.get("role") || "fisherman"

    // --- Login state ---
    const [id, setId] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const parsedId = String(id).trim()
            let loginEmail = parsedId

            if (role === "admin") {
                // Admin mapping ADMIN-001 -> admin001@fishtory.com
                if (parsedId.includes('@')) {
                    loginEmail = parsedId
                } else {
                    loginEmail = `${parsedId.toLowerCase().replace(/[^a-z0-9]/g, '')}@fishtory.com`
                }
            } else if (role === "fisherman" && !parsedId.includes("@")) {
                // Fisherman: mapping FM-2026-001 -> fm2026001@fishtory.com (if not already an email)
                loginEmail = `${parsedId.toLowerCase().replace(/[^a-z0-9]/g, '')}@fishtory.com`
            }

            const { supabase } = await import('@/lib/supabase')

            console.log('Login Attempt Trace:', {
                loginEmail,
                timestamp: new Date().toISOString()
            })

            let { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password
            })



            if (error) {
                console.error('Supabase Auth Error:', {
                    message: error.message,
                    code: error.status,
                    details: error
                })
                toast.error("Login failed", {
                    description: error.message || "Authentication failed. Please check your credentials."
                })
                setLoading(false)
                return
            }

            const userRole = data.user?.user_metadata?.role
            const fishermanId = data.user?.user_metadata?.fisherman_id
            console.log('Login success!', { role: userRole, fishermanId })

            if (isAdmin) {
                // STRICT ADMIN PORTAL
                if (userRole === 'admin') {
                    router.refresh()
                    router.push('/admin')
                } else {
                    await supabase.auth.signOut()
                    toast.error("Access Denied", {
                        description: "This portal is strictly for administrators."
                    })
                    setLoading(false)
                    return
                }
            } else {
                // STRICT FISHERMAN PORTAL
                if (userRole === 'admin' || userRole === 'staff') {
                    await supabase.auth.signOut()
                    toast.error("Access Denied", {
                        description: `Please use the designated ${userRole.charAt(0).toUpperCase() + userRole.slice(1)} portal to log in.`
                    })
                    setLoading(false)
                    return
                }
                
                // Proceed as Fisherman
                if (!fishermanId) {
                    // Fisherman hasn't completed their profile yet
                    router.refresh()
                    router.push('/complete-profile')
                } else {
                    router.refresh()
                    router.push('/dashboard')
                }
            }
        } catch (err: any) {
            console.error('Critical Login Error:', err)
            const detailedError = err.message || JSON.stringify(err)
            toast.error("System Error", {
                description: detailedError
            })
            setLoading(false)
        }
    }



    const isAdmin = role === "admin"

    return (
        <div className="min-h-[85vh] w-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
            <Card className="w-full max-w-md mx-auto shadow-xl rounded-xl border-slate-200">
                {isAdmin ? (
                    // Admin: simple login only
                    <>
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto bg-slate-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-2">
                                <Anchor className="h-6 w-6 text-slate-700" />
                            </div>
                             <CardTitle className="text-2xl text-slate-900">Admin Portal</CardTitle>
                             <CardDescription>Enter your Admin Credentials securely.</CardDescription>
                         </CardHeader>
                         {!isSupabaseConfigured && (
                             <div className="mx-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 animate-pulse">
                                 <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                     <AlertCircle className="h-4 w-4" />
                                     System Configuration Missing
                                 </div>
                                 <p className="text-xs text-red-600 leading-relaxed">
                                     Supabase environment variables are not set. If you are on Vercel, please add them in <strong>Project Settings</strong> and redeploy.
                                 </p>
                                 <a 
                                     href="https://vercel.com/dashboard" 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="text-xs text-red-700 font-semibold flex items-center gap-1 hover:underline"
                                 >
                                     Go to Vercel Dashboard <ExternalLink className="h-3 w-3" />
                                 </a>
                             </div>
                         )}
                         <form onSubmit={handleLogin}>
                            <CardContent className="space-y-5 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="id" className="text-slate-600 font-medium">Admin ID / Email</Label>
                                    <Input
                                        id="id"
                                        placeholder="ADMIN-001 or admin@fishtory.com"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        required
                                        className="focus-visible:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-600 font-medium">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="focus-visible:ring-blue-500"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="pb-6 pt-2">
                                <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white text-md h-11 transition-all" disabled={loading}>
                                    {loading ? "Authenticating..." : "Login as Admin"}
                                </Button>
                            </CardFooter>
                        </form>
                    </>
                ) : (
                    // Fisherman: Login only (Public Registration is disabled per role-based security guidelines)
                    <>
                        <CardHeader className="text-center pb-0">
                            <div className="mx-auto bg-blue-50 outline outline-1 outline-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                                <Anchor className="h-6 w-6 text-blue-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-blue-900">Fishtory Portal</CardTitle>
                            <CardDescription className="mb-4">Welcome back to the registry.</CardDescription>
                            {!isSupabaseConfigured && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 animate-pulse text-left">
                                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        System Configuration Missing
                                    </div>
                                    <p className="text-xs text-red-600 leading-relaxed">
                                        Supabase environment variables are missing. Please add them in <strong>Project Settings</strong> on Vercel or your `.env.local` file.
                                    </p>
                                    <a 
                                        href="https://vercel.com/dashboard" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-red-700 font-semibold flex items-center gap-1 hover:underline"
                                    >
                                        Go to Vercel Dashboard <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </CardHeader>

                        <form onSubmit={handleLogin}>
                            <CardContent className="space-y-4 pt-6 pb-2">
                                <div className="space-y-2">
                                    <Label htmlFor="id" className="text-slate-600 font-medium">Email Address / Fisherman ID</Label>
                                    <Input
                                        id="id"
                                        placeholder="juan@email.com or FM-YYYY-NNNN"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        required
                                        className="focus-visible:ring-blue-500 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-600 font-medium">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="focus-visible:ring-blue-500 h-11"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="pb-8 pt-4">
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-md h-11 shadow-md shadow-blue-200 transition-all" disabled={loading}>
                                    {loading ? "Authenticating..." : "Sign In"}
                                </Button>
                            </CardFooter>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}
