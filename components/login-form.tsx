"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Anchor, AlertCircle, ExternalLink } from "lucide-react"
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

    // --- Sign-up state ---
    const [signUpFirstName, setSignUpFirstName] = useState("")
    const [signUpLastName, setSignUpLastName] = useState("")
    const [signUpEmail, setSignUpEmail] = useState("")
    const [signUpPassword, setSignUpPassword] = useState("")
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("")
    const [signUpLoading, setSignUpLoading] = useState(false)
    const [signUpSuccess, setSignUpSuccess] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const parsedId = String(id).trim()
            let loginEmail = parsedId

            if (role === "admin") {
                // Admin: mapping ADMIN-001 -> admin001@fishtory.com
                loginEmail = `${parsedId.toLowerCase().replace(/[^a-z0-9]/g, '')}@fishtory.com`
            } else if (role === "fisherman" && !parsedId.includes("@")) {
                // Fisherman: mapping FM-2026-001 -> fm2026001@fishtory.com (if not already an email)
                loginEmail = `${parsedId.toLowerCase().replace(/[^a-z0-9]/g, '')}@fishtory.com`
            }

            const { supabase } = await import('@/lib/supabase')

            console.log('Login Attempt Trace:', {
                loginEmail,
                timestamp: new Date().toISOString()
            })

            const { data, error } = await supabase.auth.signInWithPassword({
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

            if (userRole === 'admin' || role === 'admin') {
                router.push('/admin')
            } else if (!fishermanId) {
                // Fisherman hasn't completed their profile yet
                router.push('/complete-profile')
            } else {
                router.push('/dashboard')
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

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()

        if (signUpPassword !== signUpConfirmPassword) {
            toast.error("Passwords do not match")
            return
        }
        if (signUpPassword.length < 6) {
            toast.error("Password too short", {
                description: "Password must be at least 6 characters."
            })
            return
        }

        setSignUpLoading(true)
        try {
            const { supabase } = await import('@/lib/supabase')

            const { data, error } = await supabase.auth.signUp({
                email: signUpEmail,
                password: signUpPassword,
                options: {
                    data: {
                        first_name: signUpFirstName.trim(),
                        last_name: signUpLastName.trim(),
                        full_name: `${signUpFirstName.trim()} ${signUpLastName.trim()}`,
                        role: 'fisherman',
                    }
                }
            })

            if (error) {
                console.error('Sign-up error:', error)
                toast.error("Sign-up failed", {
                    description: error.message
                })
                setSignUpLoading(false)
                return
            }

            // Supabase may auto-confirm depending on settings.
            // If email confirmation is required, show success message.
            // If already confirmed (no identities check), redirect directly.
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                toast.error("Account exists", {
                    description: "An account with this email already exists."
                })
                setSignUpLoading(false)
                return
            }

            setSignUpSuccess(true)
        } catch (err: any) {
            console.error('Sign-up critical error:', err)
            toast.error("System Error", {
                description: err.message
            })
        } finally {
            setSignUpLoading(false)
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
                            <div className="mx-auto bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-2">
                                <Anchor className="h-6 w-6 text-blue-700" />
                            </div>
                             <CardTitle className="text-2xl text-blue-900">Staff Portal</CardTitle>
                             <CardDescription>Enter your Staff Code securely.</CardDescription>
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
                                    <Label htmlFor="id" className="text-slate-600 font-medium">Staff Code</Label>
                                    <Input
                                        id="id"
                                        placeholder="ADMIN-001"
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
                                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-md h-11 transition-all" disabled={loading}>
                                    {loading ? "Authenticating..." : "Login to System"}
                                </Button>
                            </CardFooter>
                        </form>
                    </>
                ) : (
                    // Fisherman: Login + Sign Up tabs
                    <Tabs defaultValue="login" className="w-full">
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
                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
                                <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all">Login</TabsTrigger>
                                <TabsTrigger value="signup" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all">Sign Up</TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        {/* ── LOGIN TAB ── */}
                        <TabsContent value="login" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                            <form onSubmit={handleLogin}>
                                <CardContent className="space-y-4 pt-6 pb-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="id" className="text-slate-600 font-medium">Email Address</Label>
                                        <Input
                                            id="id"
                                            type="email"
                                            placeholder="juan@email.com"
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
                        </TabsContent>

                        {/* ── SIGN UP TAB ── */}
                        <TabsContent value="signup" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                            {signUpSuccess ? (
                                <CardContent className="pt-8 pb-10">
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <div className="bg-green-50 p-3 rounded-full">
                                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">Check Your Email!</h3>
                                        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                                            We sent a verification link to <br/><span className="font-semibold text-slate-800">{signUpEmail}</span>.
                                            Please verify your email then come back to log in.
                                        </p>
                                    </div>
                                </CardContent>
                            ) : (
                                <form onSubmit={handleSignUp}>
                                    <CardContent className="space-y-4 pt-6 pb-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName" className="text-slate-600 font-medium">First Name</Label>
                                                <Input
                                                    id="firstName"
                                                    placeholder="Juan"
                                                    value={signUpFirstName}
                                                    onChange={(e) => setSignUpFirstName(e.target.value)}
                                                    required
                                                    className="focus-visible:ring-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName" className="text-slate-600 font-medium">Last Name</Label>
                                                <Input
                                                    id="lastName"
                                                    placeholder="dela Cruz"
                                                    value={signUpLastName}
                                                    onChange={(e) => setSignUpLastName(e.target.value)}
                                                    required
                                                    className="focus-visible:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="signupEmail" className="text-slate-600 font-medium">Email Address</Label>
                                            <Input
                                                id="signupEmail"
                                                type="email"
                                                placeholder="juan@email.com"
                                                value={signUpEmail}
                                                onChange={(e) => setSignUpEmail(e.target.value)}
                                                required
                                                className="focus-visible:ring-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="signupPassword" className="text-slate-600 font-medium">Password</Label>
                                            <Input
                                                id="signupPassword"
                                                type="password"
                                                placeholder="At least 6 characters"
                                                value={signUpPassword}
                                                onChange={(e) => setSignUpPassword(e.target.value)}
                                                required
                                                className="focus-visible:ring-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword" className="text-slate-600 font-medium">Confirm Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="Re-enter your password"
                                                value={signUpConfirmPassword}
                                                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                                                required
                                                className="focus-visible:ring-blue-500"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400 text-center pt-2">
                                            By creating an account, you agree to our terms of service and privacy policy.
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pb-8 pt-4">
                                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-md h-11 shadow-md shadow-blue-200 transition-all" disabled={signUpLoading}>
                                            {signUpLoading ? "Setting up..." : "Create Account"}
                                        </Button>
                                    </CardFooter>
                                </form>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </Card>
        </div>
    )
}
