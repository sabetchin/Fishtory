"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, AlertCircle, ExternalLink, Users } from "lucide-react"
import { toast } from "sonner"
import { isSupabaseConfigured } from "@/lib/supabase"

export function StaffLoginForm() {
    const router = useRouter()
    const [id, setId] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const parsedId = String(id).trim()
            let loginEmail = parsedId

            if (parsedId.includes('@')) {
                loginEmail = parsedId
            } else if (parsedId.toLowerCase().startsWith('staff')) {
                loginEmail = `${parsedId.toLowerCase().replace(/[^a-z0-9]/g, '')}@domain.com`
            }

            const { supabase } = await import('@/lib/supabase')

            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password
            })

            if (error) {
                toast.error("Login failed", {
                    description: error.message || "Authentication failed. Please check your credentials."
                })
                setLoading(false)
                return
            }

            const userRole = data.user?.user_metadata?.role

            if (userRole === 'staff') {
                router.refresh()
                router.push('/staff/dashboard')
            } else {
                // If it's not a staff account, sign them out and show error
                await supabase.auth.signOut()
                toast.error("Access Denied", {
                    description: "This portal is strictly for authorized staff only."
                })
                setLoading(false)
            }
        } catch (err: any) {
            toast.error("System Error", {
                description: err.message || "An unexpected error occurred."
            })
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto shadow-xl rounded-xl border-slate-200">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-green-700" />
                </div>
                <CardTitle className="text-2xl text-green-900">Staff Portal</CardTitle>
                <CardDescription>Enter your Staff Code securely.</CardDescription>
            </CardHeader>
            
            {!isSupabaseConfigured && (
                <div className="mx-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 animate-pulse">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <AlertCircle className="h-4 w-4" />
                        System Configuration Missing
                    </div>
                    <p className="text-xs text-red-600 leading-relaxed">
                        Supabase environment variables are not set.
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
                        <Label htmlFor="id" className="text-slate-600 font-medium">Staff Code / Email</Label>
                        <Input
                            id="id"
                            placeholder="STAFF-01 or staff01@app.com"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                            className="focus-visible:ring-green-500"
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
                            className="focus-visible:ring-green-500"
                        />
                    </div>
                </CardContent>
                <CardFooter className="pb-6 pt-2 flex flex-col gap-3">
                    <Button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-md h-11 transition-all flex items-center gap-2" disabled={loading}>
                        <ShieldCheck className="h-4 w-4" />
                        {loading ? "Authenticating..." : "Login to System"}
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                        Authorized Personnel Only
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}
