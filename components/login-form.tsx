"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const role = searchParams.get("role") || "fisherman"
    const [id, setId] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Convert ID to email format (lowercase with @fishtory.com)
            const emailId = id.toLowerCase().replace(/\s+/g, '-')
            const email = `${emailId}@fishtory.com`

            // Attempt to sign in
            const { supabase } = await import('@/lib/supabase')
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                alert(`Login failed: ${error.message}`)
                setLoading(false)
                return
            }

            // Check user role from metadata
            const userRole = data.user?.user_metadata?.role

            // Route based on role
            if (userRole === 'admin' || role === 'admin') {
                router.push('/admin')
            } else {
                router.push('/dashboard')
            }
        } catch (error) {
            console.error('Login error:', error)
            alert('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>{role === "admin" ? "Staff Login" : "Fisherman Login"}</CardTitle>
                <CardDescription>
                    Enter your {role === "admin" ? "Staff Code" : "Fisherman ID"} to access the system.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">{role === "admin" ? "Staff Code" : "Fisherman ID"}</Label>
                        <Input
                            id="id"
                            placeholder={role === "admin" ? "ADMIN-001" : "FM-2024-001"}
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
