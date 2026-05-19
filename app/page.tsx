import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Anchor, Waves, ArrowRight } from "lucide-react"

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50 relative overflow-hidden">
            
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/50 blur-3xl opacity-50"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-cyan-100/50 blur-3xl opacity-50"></div>
            </div>

            <div className="z-10 w-full max-w-5xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="mx-auto bg-blue-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-sm border border-blue-200">
                        <Anchor className="h-10 w-10 text-blue-700" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-blue-950 tracking-tight mb-4 drop-shadow-sm">
                        Fishtory
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
                        The unified registry and reporting platform for the city's fisheries and agricultural management.
                    </p>
                </div>

                {/* Entry Pathways */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
                    
                    {/* Fisherman Card */}
                    <div className="group relative bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col items-center text-center">
                        <div className="h-12 w-12 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 text-cyan-600 group-hover:scale-110 group-hover:bg-cyan-100 transition-all">
                            <Waves className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Fisherman Portal</h2>
                        <p className="text-slate-500 mb-8 flex-1">
                            Register your account, apply for your Digital ID, and submit daily catch reports directly from your vessel.
                        </p>
                        <Link href="/login?role=fisherman" className="w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-md h-12 shadow-md hover:shadow-lg transition-all rounded-xl flex items-center justify-center gap-2 group-hover:pr-4">
                                Enter Portal
                                <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </div>

                    {/* Staff Card */}
                    <div className="group relative bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-900/10 flex flex-col items-center text-center">
                        <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 group-hover:bg-green-100 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Staff Portal</h2>
                        <p className="text-slate-500 mb-8 flex-1">
                            Access the staff dashboard to register fishermen profiles and submit data directly to the central registry.
                        </p>
                        <Link href="/staff/login" className="w-full">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-md h-12 shadow-md hover:shadow-lg transition-all rounded-xl flex items-center justify-center gap-2 group-hover:pr-4">
                                Staff Login
                                <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </div>

                    {/* Admin Card */}
                    <div className="group relative bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col items-center text-center">
                        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-slate-600 group-hover:scale-110 group-hover:bg-slate-100 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building-2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Admin Portal</h2>
                        <p className="text-slate-500 mb-8 flex-1">
                            Access the global dashboard to manage the registry, view analytics, and monitor staff performance.
                        </p>
                        <Link href="/login?role=admin" className="w-full">
                            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-md h-12 transition-all rounded-xl flex items-center justify-center gap-2 group-hover:pr-4">
                                Admin Login
                                <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Button>
                        </Link>
                    </div>

                </div>
            </div>
            
            <div className="absolute bottom-6 text-center w-full z-10 text-slate-400 text-sm font-medium">
                &copy; {new Date().getFullYear()} Republic of the Philippines. Local Government Unit.
            </div>
        </main>
    )
}
