"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { UserProfile } from "@/components/user-profile"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { DigitalIdCard } from "@/components/digital-id-card"
import { VoiceInput } from "@/components/voice-input"
import { parseTranscript, formatParsedData, getSuggestions, ParsedCatchData } from "@/lib/voice-parser"
import { savePendingReport } from "@/lib/offline-storage"
import { useSyncStatus } from "@/lib/sync-manager"
import dynamic from "next/dynamic"

const ChatAndBroadcasts = dynamic(() => import("@/components/chat-and-broadcasts").then(m => m.ChatAndBroadcasts), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-50 animate-pulse flex items-center justify-center rounded-3xl">Loading Communications...</div>
})

import { 
    PlusCircle, 
    History, 
    CreditCard, 
    ChevronLeft, 
    ChevronRight, 
    Menu, 
    X, 
    LayoutDashboard,
    LogOut,
    Anchor,
    MessageCircle,
    Wifi,
    WifiOff
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function FishermanDashboard() {
    const [activeTab, setActiveTab] = useState("new-report")
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [reports, setReports] = useState<any[]>([])
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Form state
    const [species, setSpecies] = useState("")
    const [weight, setWeight] = useState("")
    const [processingMethod, setProcessingMethod] = useState("")
    const [location, setLocation] = useState("")

    const [parsedData, setParsedData] = useState<ParsedCatchData | null>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [transcript, setTranscript] = useState('')
    const syncStatus = useSyncStatus()

    useEffect(() => {
        let channel: any;

        // Fetch current user and their reports
        const fetchUserAndData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const currentUser = session.user
                setUser(currentUser)

                // Load from cache first for immediate feedback
                const cachedReports = localStorage.getItem(`fishtory_reports_cache_${currentUser.id}`)
                if (cachedReports) {
                    try {
                        setReports(JSON.parse(cachedReports))
                    } catch (e) {
                        console.error("Failed to parse cached reports", e)
                    }
                }

                // Fetch only the reports for this specific user
                fetchReports(currentUser.id)

                // Set up real-time subscription for this specific user's reports
                const channelName = `fisherman-reports-${currentUser.id}`
                
                // Clean up existing channel if it exists
                if (channel) {
                    await supabase.removeChannel(channel)
                }
                
                channel = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        { 
                            event: 'INSERT', 
                            schema: 'public', 
                            table: 'reports',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        (payload: any) => {
                            console.log('New report received:', payload)
                            setReports((current) => [payload.new, ...current])
                        }
                    )
                    .on(
                        'postgres_changes',
                        { 
                            event: 'UPDATE', 
                            schema: 'public', 
                            table: 'reports',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        (payload: any) => {
                            console.log('Report updated:', payload)
                            setReports((current) =>
                                current.map((report) =>
                                    report.id === payload.new.id ? payload.new : report
                                )
                            )
                        }
                    )
                    .on(
                        'postgres_changes',
                        { 
                            event: 'DELETE', 
                            schema: 'public', 
                            table: 'reports',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        (payload: any) => {
                            console.log('Report deleted:', payload)
                            setReports((current) =>
                                current.filter((report) => report.id !== payload.old.id)
                            )
                        }
                    )
                    .subscribe((status: string) => {
                        console.log('Real-time subscription status:', status)
                        if (status === 'SUBSCRIPTION_ERROR') {
                            console.error('Real-time subscription error for reports table')
                        }
                    })
            }
        }
        fetchUserAndData()

        // Listen for auth changes to update user state instantly
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session?.user) {
                setUser(session.user)
            }
        })

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
            authListener?.unsubscribe()
        }
    }, []) // Run only once on mount

    const fetchReports = async (userId: string) => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setReports(data)
            // Save to localStorage so they persist after logout/refresh
            localStorage.setItem(`fishtory_reports_cache_${userId}`, JSON.stringify(data))
        }
    }

    const handleVoiceTranscript = (text: string) => {
        setTranscript(text)
        // Parse the transcript and update form fields
        const parsed = parseTranscript(text)
        setParsedData(parsed)
        
        // Update form fields with parsed data
        if (parsed.species) setSpecies(parsed.species)
        if (parsed.weight) setWeight(parsed.weight)
        if (parsed.processingMethod) setProcessingMethod(parsed.processingMethod)
        if (parsed.location) setLocation(parsed.location)
        
        // Show suggestions if confidence is low
        if (parsed.confidence < 0.5) {
            setShowSuggestions(true)
        }
        
        toast.success("Voice Processed", {
            description: formatParsedData(parsed)
        })
    }

    const handleSubmit = async () => {
        if (!user) return toast.error("Authentication required", {
            description: "You must be logged in to submit a report."
        })
        if (!species || !weight || !processingMethod || !location) {
            return toast.error("Missing Information", {
                description: "Please fill in all fields."
            })
        }

        setLoading(true)

        // Pull these silently from user metadata — not shown in form
        const fishermanId = user.user_metadata?.fisherman_id || 'Unknown'
        const boatName = user.user_metadata?.boat_name || 'Unknown'

        // Check if online
        if (navigator.onLine) {
            // Submit directly to Supabase
            const { error } = await supabase
                .from('reports')
                .insert([
                    {
                        fisherman_id: fishermanId,
                        user_id: user.id,
                        boat_name: boatName,
                        species,
                        weight_kg: Number(weight),
                        processing_method: processingMethod,
                        location,
                        status: 'pending'
                    }
                ])

            if (error) {
                toast.error("Submission Failed", {
                    description: error.message
                })
            } else {
                toast.success("Report Submitted", {
                    description: "Your catch report has been sent successfully!"
                })
                // Reset form
                setSpecies("")
                setWeight("")
                setProcessingMethod("")
                setLocation("")
                // Switch to reports tab to see it
                setActiveTab("my-reports")
            }
        } else {
            // Offline: Save to IndexedDB for later sync
            try {
                const reportId = await savePendingReport({
                    fisherman_id: fishermanId,
                    user_id: user.id,
                    boat_name: boatName,
                    species,
                    weight_kg: Number(weight),
                    processing_method: processingMethod,
                    location,
                    transcript: parsedData ? formatParsedData(parsedData) : undefined
                })
                
                toast.success("Report Saved Offline", {
                    description: "Your report will be synced when connection is restored."
                })
                
                // Reset form
                setSpecies("")
                setWeight("")
                setProcessingMethod("")
                setLocation("")
                setParsedData(null)
            } catch (error) {
                toast.error("Save Failed", {
                    description: "Could not save report offline. Please try again."
                })
            }
        }
        setLoading(false)
    }

    // Helper to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const navItems = [
        { id: 'new-report', label: 'New Catch', icon: PlusCircle, description: 'Submit a new report' },
        { id: 'my-reports', label: 'My Reports', icon: History, description: 'View history' },
        { id: 'my-id', label: 'My ID Card', icon: CreditCard, description: 'Digital ID' },
        { id: 'communications', label: 'Community', icon: MessageCircle, description: 'Chat & Announcements' },
    ]

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* --- SIDEBAR (Desktop) --- */}
            <aside 
                className={cn(
                    "hidden md:flex flex-col border-r border-slate-200/60 bg-white transition-all duration-300 shadow-[20px_0_30px_rgba(0,0,0,0.01)] z-30",
                    isSidebarCollapsed ? "w-20" : "w-72"
                )}
            >
                <div className="p-8 flex items-center gap-4 border-b border-slate-100 h-24 overflow-hidden">
                    <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                        <Anchor className="h-6 w-6" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                            <span className="font-black text-2xl text-slate-900 tracking-tighter leading-none">Fis<span className="text-blue-600">tory</span></span>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Fisherman Hub</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-6 space-y-3 mt-4">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden",
                                activeTab === item.id 
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]" 
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "h-6 w-6 shrink-0 transition-all duration-300", 
                                activeTab === item.id ? "text-white" : "group-hover:scale-110",
                                !isSidebarCollapsed && "mr-1"
                            )} />
                            {!isSidebarCollapsed && (
                                <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-4 duration-500 overflow-hidden">
                                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                                    <span className={cn(
                                        "text-[10px] font-medium opacity-60 whitespace-nowrap",
                                        activeTab === item.id ? "text-blue-50" : "text-slate-400"
                                    )}>{item.description}</span>
                                </div>
                            )}
                            {isSidebarCollapsed && activeTab === item.id && (
                                <div className="absolute inset-0 bg-white/10" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/30">
                    {/* Sync Status Indicator */}
                    {!isSidebarCollapsed && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sync Status</span>
                                {syncStatus.isSyncing && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                {syncStatus.pendingCount > 0 ? (
                                    <>
                                        <WifiOff className="h-3 w-3 text-amber-500" />
                                        <span>{syncStatus.pendingCount} pending</span>
                                    </>
                                ) : (
                                    <>
                                        <Wifi className="h-3 w-3 text-green-500" />
                                        <span>All synced</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all group border border-transparent hover:border-slate-100"
                    >
                        {isSidebarCollapsed ? <ChevronRight className="h-6 w-6 mx-auto transition-transform group-hover:translate-x-1" /> : (
                            <>
                                <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                                <span className="text-sm font-bold tracking-tight">Collapse View</span>
                            </>
                        )}
                    </button>
                    
                    <div className="flex items-center gap-4 p-2">
                        <div className={cn("transition-all duration-300", isSidebarCollapsed ? "mx-auto" : "")}>
                            <UserProfile />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-sm font-bold text-slate-800 leading-none">Account</span>
                                <button 
                                    onClick={async () => {
                                        await supabase.auth.signOut();
                                        window.location.href = "/login";
                                    }}
                                    className="text-[11px] font-bold text-red-500 hover:text-red-600 mt-1 flex items-center gap-1 transition-colors"
                                >
                                    <LogOut className="h-3 w-3" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* --- MOBILE NAV (Mobile) --- */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2 rounded-xl text-white shadow-md shadow-blue-100">
                        <Anchor className="h-5 w-5" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tighter">Fis<span className="text-blue-600">tory</span></span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl hover:bg-slate-100">
                    <Menu className="h-6 w-6 text-slate-600" />
                </Button>
            </div>

            {/* --- MOBILE DRAWER --- */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300">
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-6 flex items-center justify-between border-b border-slate-100 h-20">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Navigation</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl">
                                <X className="h-6 w-6 text-slate-400" />
                            </Button>
                        </div>
                        <nav className="flex-1 p-6 space-y-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id)
                                        setIsMobileMenuOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-5 p-5 rounded-2xl transition-all font-bold text-lg text-left",
                                        activeTab === item.id 
                                            ? "bg-blue-600 text-white shadow-xl shadow-blue-200" 
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <item.icon className={cn("h-6 w-6", activeTab === item.id ? "text-white" : "text-blue-500")} />
                                    <div className="flex flex-col">
                                        <span>{item.label}</span>
                                        <span className={cn("text-[10px] font-medium opacity-60", activeTab === item.id ? "text-blue-50" : "text-slate-400")}>{item.description}</span>
                                    </div>
                                </button>
                            ))}
                        </nav>
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-6">
                            <div className="flex items-center gap-4">
                                <UserProfile />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-800">Account Settings</span>
                                    <span className="text-xs text-slate-400">Manage your profile</span>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 font-bold flex items-center gap-2"
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = "/login";
                                }}
                            >
                                <LogOut className="h-5 w-5" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT --- */}
            <main className={cn(
                "flex-1 overflow-y-auto pt-16 md:pt-0 transition-all duration-300",
                "bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)]"
            )}>
                <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                                {navItems.find(i => i.id === activeTab)?.label}
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium italic opacity-70">
                                {navItems.find(i => i.id === activeTab)?.description}
                            </p>
                        </div>
                    </div>

                    <div className="w-full">
                        {activeTab === "new-report" && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-none shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20">
                                    <CardHeader className="p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                            <div className="space-y-1">
                                                <CardTitle className="text-2xl font-bold text-slate-800">New Catch Report</CardTitle>
                                                <CardDescription className="text-slate-500 font-medium opacity-80 uppercase tracking-widest text-[10px]">
                                                    Fill out the details below
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <VoiceInput
                                            onTranscript={handleVoiceTranscript}
                                            lang="tl-PH"
                                        />
                                        {showSuggestions && parsedData && getSuggestions(parsedData).length > 0 && (
                                            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                                <div className="flex items-center gap-2 mb-2 text-amber-700">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Suggestions</span>
                                                </div>
                                                <ul className="text-xs text-amber-800 space-y-1">
                                                    {getSuggestions(parsedData).map((suggestion, idx) => (
                                                        <li key={idx}>• {suggestion}</li>
                                                    ))}
                                                </ul>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setShowSuggestions(false)}
                                                    className="mt-2 text-amber-700 hover:text-amber-900"
                                                >
                                                    Dismiss
                                                </Button>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Fish Species / Uri ng Isda</Label>
                                                <Select value={species} onValueChange={setSpecies}>
                                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium">
                                                        <SelectValue placeholder="Pumili ng isda" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-200 p-2">
                                                        <SelectItem value="bangus" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Bangus (Milkfish)</SelectItem>
                                                        <SelectItem value="tilapia" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Tilapia</SelectItem>
                                                        <SelectItem value="lapu-lapu" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Lapu-lapu (Grouper)</SelectItem>
                                                        <SelectItem value="dilis" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Dilis (Anchovies)</SelectItem>
                                                        <SelectItem value="sardinas" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Sardinas (Sardines)</SelectItem>
                                                        <SelectItem value="tuna" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Tuna</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Location / Lokasyon</Label>
                                                <Select value={location} onValueChange={setLocation}>
                                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium">
                                                        <SelectValue placeholder="Pumili ng lokasyon" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-200 p-2">
                                                        <SelectItem value="Banicain" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Banicain</SelectItem>
                                                        <SelectItem value="Barretto" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Barretto</SelectItem>
                                                        <SelectItem value="Kalaklan" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Kalaklan</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Weight (kg) / Bigat</Label>
                                                <div className="relative group">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="0.0" 
                                                        value={weight}
                                                        onChange={(e) => setWeight(e.target.value)}
                                                        className="h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-4 focus:ring-blue-100 transition-all text-xl font-bold pr-12"
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold tracking-tighter uppercase">KG</div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Processing / Pagproseso</Label>
                                                <Select value={processingMethod} onValueChange={setProcessingMethod}>
                                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium">
                                                        <SelectValue placeholder="Pumili ng proseso" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl shadow-2xl border-slate-200 p-2">
                                                        <SelectItem value="fresh" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Fresh / Sariwa</SelectItem>
                                                        <SelectItem value="smoked" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Smoked / Tinapa</SelectItem>
                                                        <SelectItem value="dried" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Dried / Tuyo</SelectItem>
                                                        <SelectItem value="salted" className="rounded-xl p-3 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">Salted / Daing</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-8 pt-0 flex justify-end">
                                        <Button 
                                            size="lg"
                                            className={cn(
                                                "w-full md:w-auto h-16 px-10 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]",
                                                "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                                            )}
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Submitting...
                                                </div>
                                            ) : (
                                                "Submit Report / Ipasa ang Ulat"
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}

                        {activeTab === "my-reports" && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-none shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20">
                                    <CardHeader className="p-8 border-b border-slate-100">
                                        <CardTitle className="text-2xl font-bold">Report History</CardTitle>
                                        <CardDescription className="text-slate-500 font-medium">Track your submitted reports.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto w-full">
                                            <Table className="min-w-[600px]">
                                                <TableHeader className="bg-slate-50/80">
                                                    <TableRow className="hover:bg-transparent border-slate-100">
                                                        <TableHead className="px-8 h-14 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">Date</TableHead>
                                                        <TableHead className="px-8 h-14 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">Fish Species</TableHead>
                                                        <TableHead className="px-8 h-14 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">Total Weight</TableHead>
                                                        <TableHead className="px-8 h-14 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">Location</TableHead>
                                                        <TableHead className="px-8 h-14 font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">Approval Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reports.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-24">
                                                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                                                    <div className="bg-slate-50 p-6 rounded-full">
                                                                        <History className="h-12 w-12 opacity-20" />
                                                                    </div>
                                                                    <p className="text-lg font-medium italic">Your reporting history is empty.</p>
                                                                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700" onClick={() => setActiveTab('new-report')}>
                                                                        Submit your first report now
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        reports.map((report) => (
                                                            <TableRow key={report.id} className="group hover:bg-blue-50/30 transition-all border-slate-50 border-b last:border-0 cursor-default">
                                                                <TableCell className="px-8 py-5">
                                                                    <div className="font-bold text-slate-900">{formatDate(report.created_at)}</div>
                                                                    <div className="text-[10px] text-slate-400 font-medium tracking-tight">Ref: {report.id.substring(0,8).toUpperCase()}</div>
                                                                </TableCell>
                                                                <TableCell className="px-8 py-5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                                                            {report.species.charAt(0)}
                                                                        </div>
                                                                        <span className="capitalize font-semibold text-slate-700">{report.species}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-8 py-5">
                                                                    <span className="font-extrabold text-slate-900">{report.weight_kg}</span>
                                                                    <span className="text-slate-400 text-xs font-bold ml-1 tracking-tighter uppercase">KG</span>
                                                                </TableCell>
                                                                <TableCell className="px-8 py-5">
                                                                    <div className="text-slate-600 font-medium">{report.location}</div>
                                                                </TableCell>
                                                                <TableCell className="px-8 py-5">
                                                                    <span className={cn(
                                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest ring-1 ring-inset shadow-sm transition-all",
                                                                        report.status === 'approved' 
                                                                            ? "bg-green-50 text-green-700 ring-green-600/20" 
                                                                            : report.status === 'rejected'
                                                                                ? "bg-red-50 text-red-700 ring-red-600/20"
                                                                                : "bg-amber-50 text-amber-700 ring-amber-600/20"
                                                                    )}>
                                                                        <div className={cn(
                                                                            "h-1.5 w-1.5 rounded-full",
                                                                            report.status === 'approved' ? "bg-green-500" : report.status === 'rejected' ? "bg-red-500" : "bg-amber-500 animate-pulse"
                                                                        )} />
                                                                        {report.status}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === "my-id" && (
                            <div className="animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex flex-col items-center gap-10 py-10">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Digital Fisherfolk ID</h2>
                                        <p className="text-slate-500 font-medium opacity-80 italic">Present this digital copy for official verification.</p>
                                    </div>
                                    <div className="relative group perspective-1000 shadow-2xl transition-all duration-500 rounded-3xl ring-1 ring-slate-200 bg-white p-1">
                                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[2.5rem] opacity-20 blur-2xl -z-10 group-hover:opacity-30 transition-all duration-500" />
                                        <DigitalIdCard />
                                    </div>
                                    <div className="flex gap-4">
                                        <Button variant="outline" className="rounded-2xl border-slate-200 h-14 px-8 font-bold shadow-sm hover:shadow-md transition-all">
                                            Download PDF
                                        </Button>
                                        <Button className="rounded-2xl h-14 px-8 font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700">
                                            Print Copy
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "communications" && (
                            <div className="animate-in fade-in zoom-in-95 duration-500">
                                {user ? (
                                    <ChatAndBroadcasts 
                                        currentUser={{ 
                                            id: user.id, 
                                            name: user.user_metadata?.first_name 
                                                ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}` 
                                                : 'Fisherman', 
                                            role: 'fisherman' 
                                        }} 
                                        role="fisherman" 
                                    />
                                ) : (
                                    <div>Authenticating...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
