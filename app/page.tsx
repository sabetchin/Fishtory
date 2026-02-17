import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50 dark:bg-slate-900">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold text-center w-full mb-8 text-blue-800">Fishtory</h1>
            </div>

            <div className="grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-8">
                <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
                    <h2 className={`mb-3 text-2xl font-semibold`}>
                        Fisherman{' '}
                        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                            -&gt;
                        </span>
                    </h2>
                    <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                        Submit your catch reports and manage your profile.
                    </p>
                    <div className="mt-4">
                        <Link href="/login?role=fisherman">
                            <Button>Login as Fisherman</Button>
                        </Link>
                    </div>
                </div>

                <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
                    <h2 className={`mb-3 text-2xl font-semibold`}>
                        Agricultural Office{' '}
                        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                            -&gt;
                        </span>
                    </h2>
                    <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                        Manage reports, analytics, and communications.
                    </p>
                    <div className="mt-4">
                        <Link href="/login?role=admin">
                            <Button variant="secondary">Login as Staff</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
