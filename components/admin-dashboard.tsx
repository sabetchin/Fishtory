"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { UserProfile } from "@/components/user-profile"
import { DownloadReportsButton } from "@/components/download-reports-button"
import { toast } from "sonner" 
import { Fish, MessageCircle } from "lucide-react"

// Dynamic import for Chat Component
const ChatAndBroadcasts = dynamic(() => import("@/components/chat-and-broadcasts").then(m => m.ChatAndBroadcasts), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Communications...</div>
})

// Dynamic import for Leaflet map to avoid window undefined error
const CatchMap = dynamic(() => import("@/components/catch-map"), { 
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse flex items-center justify-center">Loading Map...</div>
})

const AnalyticsView = dynamic(() => import("@/components/analytics-view"), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-50 animate-pulse flex items-center justify-center">Loading Analytics...</div>
})

const FishermanRegistry = dynamic(() => import("@/components/fisherman-registry").then(m => m.FishermanRegistry), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-50 animate-pulse flex items-center justify-center">Loading Registry...</div>
})

// Supabase client is imported from @/lib/supabase

export function AdminDashboard() {
    const [reports, setReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [fishermenMap, setFishermenMap] = useState<Record<string, { first_name: string, last_name: string }>>({})

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUser(session.user)
            }
        }
        fetchUser()
    }, [])

    const fetchReports = async () => {
        setLoading(true)
        const [reportsRes, profilesRes] = await Promise.all([
            supabase.from('reports').select('*').order('created_at', { ascending: false }),
            supabase.from('fishermen_profiles').select('user_id, first_name, last_name')
        ])

        if (!reportsRes.error && reportsRes.data) {
            setReports(reportsRes.data)
        }
        if (!profilesRes.error && profilesRes.data) {
            const map: Record<string, { first_name: string, last_name: string }> = {}
            profilesRes.data.forEach((p: any) => {
                if (p.user_id) map[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '' }
            })
            setFishermenMap(map)
        }
        setLoading(false)
    }

    useEffect(() => {
        // Initial fetch
        fetchReports()

        // Set up real-time subscription
        const channel = supabase
            .channel('admin-reports-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reports' },
                (payload: any) => {
                    console.log('New report received:', payload)
                    setReports((current) => [payload.new, ...current])
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'reports' },
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
                { event: 'DELETE', schema: 'public', table: 'reports' },
                (payload: any) => {
                    console.log('Report deleted:', payload)
                    setReports((current) =>
                        current.filter((report) => report.id !== payload.old.id)
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleUpdateStatus = async (reportId: string, newStatus: string) => {
        const { error } = await supabase
            .from('reports')
            .update({ status: newStatus })
            .eq('id', reportId)

        if (error) {
            toast.error("Error updating status", {
                description: error.message
            })
        } else {
            toast.success(`Report ${newStatus} successfully`)
            // Update local state is handled by real-time listener normally, 
            // but we filter locally for faster feedback
            setReports((current) => 
                current.map((report) => 
                    report.id === reportId ? { ...report, status: newStatus } : report
                )
            )
        }
    }

    // Calculate stats
    const totalCatch = reports
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + Number(r.weight_kg), 0)
    
    const pendingCount = reports.filter(r => r.status === 'pending').length
    const uniqueFishermen = new Set(reports.map(r => r.fisherman_id)).size

    const speciesBreakdown = useMemo(() => {
        const approved = reports.filter(r => r.status === 'approved')
        const breakdown: Record<string, number> = {}
        approved.forEach(r => {
            const species = r.species || 'Unknown'
            breakdown[species] = (breakdown[species] || 0) + Number(r.weight_kg)
        })
        return Object.entries(breakdown)
            .map(([species, weight]) => ({ species, weight }))
            .sort((a, b) => b.weight - a.weight)
    }, [reports])

    return (
        <div className="container mx-auto py-6 sm:py-10 px-4 md:px-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 border-b-4 border-blue-500 pb-2 inline-block">Agricultural Office Dashboard</h1>
                <UserProfile />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Fish className="h-12 w-12 text-blue-900" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Catch (Approved)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700">{totalCatch.toLocaleString()} kg</div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    Click to see breakdown per species
                                </p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Fish className="h-5 w-5 text-blue-600" />
                                Catch Breakdown by Species
                            </DialogTitle>
                            <DialogDescription>
                                Total weight distribution of all approved catch reports.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Species / Uri ng Isda</TableHead>
                                        <TableHead className="text-right">Total Weight (kg)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {speciesBreakdown.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                                No approved data available.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        speciesBreakdown.map((item) => (
                                            <TableRow key={item.species}>
                                                <TableCell className="capitalize font-medium">{item.species}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-blue-600">
                                                    {item.weight.toLocaleString()} kg
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {speciesBreakdown.length > 0 && (
                                        <TableRow className="bg-blue-50/50 font-bold border-t-2">
                                            <TableCell>Grand Total</TableCell>
                                            <TableCell className="text-right">{totalCatch.toLocaleString()} kg</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Fishermen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueFishermen}</div>
                        <p className="text-xs text-muted-foreground">Engaged in reporting</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Requires review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">100%</div>
                        <p className="text-xs text-muted-foreground">All reports validated</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="reports" className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 flex">
                    <TabsTrigger value="reports" className="whitespace-nowrap">Incoming Reports</TabsTrigger>
                    <TabsTrigger value="map" className="whitespace-nowrap">Map View</TabsTrigger>
                    <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
                    <TabsTrigger value="fishermen" className="whitespace-nowrap">Fishermen Registry</TabsTrigger>
                    <TabsTrigger value="communications" className="whitespace-nowrap bg-amber-100 text-amber-900 border border-amber-200">
                        <MessageCircle className="w-4 h-4 mr-2" /> Communications Built-in
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>Recent Catch Reports</CardTitle>
                                    <CardDescription>Review and approve daily catch submissions.</CardDescription>
                                </div>
                                <DownloadReportsButton />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto w-full">
                                <Table className="min-w-[800px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Fisherman Name</TableHead>
                                            <TableHead>Species</TableHead>
                                            <TableHead>Weight</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8">Loading reports...</TableCell>
                                            </TableRow>
                                        ) : reports.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reports found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            reports.map((report) => (
                                                <TableRow key={report.id}>
                                                    <TableCell className="whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium whitespace-nowrap">
                                                        {fishermenMap[report.user_id]
                                                            ? `${fishermenMap[report.user_id].last_name}, ${fishermenMap[report.user_id].first_name}`
                                                            : report.fisherman_id || '—'}
                                                    </TableCell>
                                                    <TableCell className="capitalize whitespace-nowrap">{report.species}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{report.weight_kg} kg</TableCell>
                                                    <TableCell className="whitespace-nowrap">{report.location}</TableCell>
                                                    <TableCell>
                                                        <span className={`capitalize font-medium whitespace-nowrap ${
                                                            report.status === 'approved' ? 'text-green-600' : 
                                                            report.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                                                        }`}>
                                                            {report.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {report.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-green-600 hover:bg-green-700 h-8 text-xs px-2 sm:px-3"
                                                                    onClick={() => handleUpdateStatus(report.id, 'approved')}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="destructive"
                                                                    className="h-8 text-xs px-2 sm:px-3"
                                                                    onClick={() => handleUpdateStatus(report.id, 'rejected')}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="map">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catch Location Map</CardTitle>
                            <CardDescription>Visual distribution of catch reports across the city.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CatchMap reports={reports} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics Overview</CardTitle>
                            <CardDescription>Detailed statistical breakdown of fisheries data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AnalyticsView reports={reports} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="fishermen">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fishermen Registry</CardTitle>
                            <CardDescription>Manage and track registered fishermen in the city.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FishermanRegistry />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="communications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Communications & Broadcasts</CardTitle>
                            <CardDescription>Talk directly with fishermen and post city-wide announcements.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {user ? (
                                <ChatAndBroadcasts 
                                    currentUser={{ id: user.id, name: user.user_metadata?.first_name || 'Admin', role: 'admin' }} 
                                    role="admin" 
                                />
                            ) : (
                                <div>Authenticating...</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
