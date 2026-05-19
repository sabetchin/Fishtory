import { StaffLoginForm } from "@/components/staff-login-form"
import { Suspense } from "react"

export default function StaffLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <Suspense fallback={<div className="animate-pulse">Loading secure portal...</div>}>
                <StaffLoginForm />
            </Suspense>
        </div>
    )
}
