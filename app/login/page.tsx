import { LoginForm } from "@/components/login-form"
import { Suspense } from "react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
