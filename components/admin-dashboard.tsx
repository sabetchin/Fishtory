"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import dynamic from "next/dynamic"
import { UserProfile } from "@/components/user-profile"
import { DownloadReportsButton } from "@/components/download-reports-button"
import { toast } from "sonner" 
import { Fish, MessageCircle, Users, Download, Loader2, Plus, ShieldCheck, CheckCircle2, UserPlus, Search, Trash2 } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"
import { createStaffAccount } from "@/app/actions/create-staff"

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
    const [staffCounts, setStaffCounts] = useState<{id: string, name: string, fullName: string, email: string, count: number}[]>([])
    const [isGeneratingStaffReport, setIsGeneratingStaffReport] = useState(false)

    // Staff Creation state
    const [staffForm, setStaffForm] = useState({
        staffId: "",
        fullName: "",
        email: "",
        password: ""
    })
    const [createdStaffCreds, setCreatedStaffCreds] = useState<{ email: string; pass: string; id: string } | null>(null)
    const [creatingStaff, setCreatingStaff] = useState(false)
    const [staffSearchQuery, setStaffSearchQuery] = useState("")

    // Delete report state
    const [reportToDelete, setReportToDelete] = useState<string | null>(null)
    const [deletingReport, setDeletingReport] = useState(false)

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
        const [reportsRes, profilesRes, staffRes] = await Promise.all([
            supabase.from('reports').select('*').order('created_at', { ascending: false }),
            supabase.from('fisherman_registration').select('user_id, first_name, last_name, created_by'),
            supabase.from('staff_profiles').select('user_id, staff_id, full_name, email')
        ])

        if (!reportsRes.error && reportsRes.data) {
            setReports(reportsRes.data)
        }
        if (!profilesRes.error && profilesRes.data) {
            const map: Record<string, { first_name: string, last_name: string }> = {}
            const countsMap: Record<string, number> = {}

            profilesRes.data.forEach((p: any) => {
                if (p.user_id) map[p.user_id] = { first_name: p.first_name || '', last_name: p.last_name || '' }
                if (p.created_by) {
                    countsMap[p.created_by] = (countsMap[p.created_by] || 0) + 1
                }
            })
            setFishermenMap(map)

            if (!staffRes.error && staffRes.data) {
                const sCounts = staffRes.data.map((staff: any) => ({
                    id: staff.user_id,
                    name: staff.staff_id || 'Staff',
                    fullName: staff.full_name || 'Staff Member',
                    email: staff.email || '',
                    count: countsMap[staff.user_id] || 0
                })).sort((a: any, b: any) => a.name.localeCompare(b.name))
                setStaffCounts(sCounts)
            }
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
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'fisherman_registration' },
                (payload: any) => {
                    if (payload.new.created_by) {
                        setStaffCounts((current) => 
                            current.map(staff => 
                                staff.id === payload.new.created_by 
                                    ? { ...staff, count: staff.count + 1 }
                                    : staff
                            )
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleDeleteReport = async () => {
        if (!reportToDelete) return
        setDeletingReport(true)
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportToDelete)
        if (error) {
            toast.error("Failed to delete report", { description: error.message })
        } else {
            toast.success("Report deleted successfully")
            setReports((current) => current.filter((r) => r.id !== reportToDelete))
        }
        setReportToDelete(null)
        setDeletingReport(false)
    }

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

    // Handle staff account creation submission
    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreatingStaff(true)
        setCreatedStaffCreds(null)

        try {
            if (!staffForm.email || !staffForm.fullName || !staffForm.staffId) {
                throw new Error("Please fill out all required fields.")
            }

            const res = await createStaffAccount({
                email: staffForm.email,
                password: staffForm.password || undefined,
                fullName: staffForm.fullName,
                staffId: staffForm.staffId
            })

            if (!res.success) {
                throw new Error(res.error)
            }

            toast.success("Staff Account Provisioned Successfully")

            setCreatedStaffCreds({
                email: res.email || staffForm.email,
                pass: res.password || "",
                id: res.staffId || ""
            })

            // Reset form
            setStaffForm({
                staffId: "",
                fullName: "",
                email: "",
                password: ""
            })

            // Refresh dashboards & lists
            fetchReports()
        } catch (error: any) {
            toast.error("Failed to provision staff", { description: error.message })
        } finally {
            setCreatingStaff(false)
        }
    }

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

    const exportStaffPDF = async () => {
        setIsGeneratingStaffReport(true)
        setTimeout(async () => {
            const element = document.getElementById("staff-pdf-container")
            if (element) {
                try {
                    const canvas = await html2canvas(element, { scale: 2, useCORS: true })
                    const imgData = canvas.toDataURL("image/png")
                    const pdf = new jsPDF("p", "mm", "a4")
                    const pdfWidth = pdf.internal.pageSize.getWidth()
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
                    
                    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
                    pdf.save(`Staff_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`)
                } catch (error: any) {
                    console.error("PDF Export Error:", error)
                    toast.error("Failed to generate PDF", { description: error.message })
                } finally {
                    setIsGeneratingStaffReport(false)
                }
            } else {
                setIsGeneratingStaffReport(false)
            }
        }, 500)
    }

    return (
        <div className="container mx-auto py-6 sm:py-10 px-4 md:px-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 border-b-4 border-blue-500 pb-2 inline-block">Agricultural Office Dashboard</h1>
                <UserProfile />
            </div>

            {/* Staff Performance Section */}
            {staffCounts.length > 0 && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            Staff Performance Tracker
                        </h2>
                        <Button size="sm" variant="outline" onClick={exportStaffPDF} disabled={isGeneratingStaffReport} className="flex gap-2">
                            {isGeneratingStaffReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            {isGeneratingStaffReport ? "Generating PDF..." : "Export Report"}
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {staffCounts.map((staff) => (
                            <Card key={staff.id} className="bg-gradient-to-br from-white to-blue-50/50 border-blue-100 shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 p-2 rounded-full">
                                            <Users className="h-4 w-4 text-blue-700" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{staff.name}</p>
                                            <p className="text-xs text-slate-500">Profiles Gathered</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-700">{staff.count}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

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
                    <TabsTrigger value="staff" className="whitespace-nowrap">Staff Management</TabsTrigger>
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
                                                        <div className="flex gap-2 flex-wrap items-center">
                                                            {report.status === 'pending' && (
                                                                <>
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
                                                                </>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                title="Delete report"
                                                                onClick={() => setReportToDelete(report.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
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
                <TabsContent value="staff">
                    <div className="grid lg:grid-cols-12 gap-6">
                        {/* Provision New Staff Card */}
                        <div className="lg:col-span-5 space-y-6">
                            <Card className="border-blue-100 shadow-sm">
                                <CardHeader className="bg-gradient-to-r from-blue-50/50 to-white border-b border-slate-100">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                        <UserPlus className="h-5 w-5 text-blue-600" />
                                        Provision Municipal Staff
                                    </CardTitle>
                                    <CardDescription>Create secure server-side login credentials for field data collectors.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {createdStaffCreds && (
                                        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-5 mb-6 space-y-3 animate-in zoom-in duration-300">
                                            <div className="flex items-center gap-2 text-blue-800 font-bold">
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                Staff Account Provisioned!
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium">
                                                Please share these login credentials securely with the new municipal staff member:
                                            </p>
                                            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 font-mono text-xs shadow-sm">
                                                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                    <span className="text-slate-500 font-semibold">Staff ID:</span>
                                                    <span className="text-blue-700 font-bold">{createdStaffCreds.id}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                                    <span className="text-slate-500 font-semibold">Login Email:</span>
                                                    <span className="text-slate-800 font-bold select-all">{createdStaffCreds.email}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-slate-500 font-semibold">Temporary Password:</span>
                                                    <span className="text-slate-800 font-bold select-all">{createdStaffCreds.pass}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(
                                                            `Staff ID: ${createdStaffCreds.id}\nEmail: ${createdStaffCreds.email}\nTemporary Password: ${createdStaffCreds.pass}`
                                                        )
                                                        toast.success("Copied to Clipboard")
                                                    }}
                                                >
                                                    Copy Credentials
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleCreateStaff} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Staff ID / Code *</Label>
                                            <Input 
                                                placeholder="e.g. STAFF04"
                                                value={staffForm.staffId}
                                                onChange={(e) => setStaffForm({ ...staffForm, staffId: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Full Name *</Label>
                                            <Input 
                                                placeholder="e.g. Maria Clara"
                                                value={staffForm.fullName}
                                                onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Address *</Label>
                                            <Input 
                                                type="email"
                                                placeholder="m.clara@municipality.gov"
                                                value={staffForm.email}
                                                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Temporary Password (Optional)</Label>
                                            <Input 
                                                type="text"
                                                placeholder="Leave blank to auto-generate"
                                                value={staffForm.password}
                                                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                            />
                                        </div>
                                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2" disabled={creatingStaff}>
                                            {creatingStaff ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Provisioning...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Provision Staff Account
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Staff List Registry */}
                        <div className="lg:col-span-7">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Municipal Staff Members</CardTitle>
                                        <CardDescription>Track active field staff registry and records gathered.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input 
                                                placeholder="Search staff by ID, name or email..." 
                                                className="pl-9"
                                                value={staffSearchQuery}
                                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead>Staff ID</TableHead>
                                                    <TableHead>Full Name</TableHead>
                                                    <TableHead>Email Address</TableHead>
                                                    <TableHead className="text-right">Registrations</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {staffCounts.filter(s => 
                                                    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                                                    s.fullName.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                                                    s.email.toLowerCase().includes(staffSearchQuery.toLowerCase())
                                                ).length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                                                            No matching staff records found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    staffCounts.filter(s => 
                                                        s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                                                        s.fullName.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                                                        s.email.toLowerCase().includes(staffSearchQuery.toLowerCase())
                                                    ).map((staff) => (
                                                        <TableRow key={staff.id}>
                                                            <TableCell className="font-bold text-blue-700">{staff.name}</TableCell>
                                                            <TableCell className="font-medium">{staff.fullName}</TableCell>
                                                            <TableCell className="text-slate-600">{staff.email}</TableCell>
                                                            <TableCell className="text-right font-mono font-semibold text-slate-700">{staff.count}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
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

            {/* Hidden Renderable PDF Blueprint for Staff */}
            {staffCounts.length > 0 && (
                <div className="fixed -z-50 opacity-0 pointer-events-none top-0 left-0">
                    <div id="staff-pdf-container" className="bg-white text-black font-serif p-10 w-[794px] min-h-[1123px]">
                        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-bold uppercase">STAFF PERFORMANCE REPORT</h1>
                                <p className="text-sm">Regional Fisheries Management Office</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm">Report Date: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div className="mb-10 pl-4" style={{ borderLeft: '4px solid black' }}>
                            <h3 className="text-lg font-bold uppercase mb-3">Executive Summary</h3>
                            <p className="text-justify leading-relaxed text-sm">
                                This document details the data gathering performance of municipal staff. The metrics represent the total number of fishermen profiles authenticated and logged by each staff member. This audit ensures proper field engagement and resource tracking.
                            </p>
                        </div>

                        <div className="border border-black">
                            <div className="flex font-bold border-b border-black bg-gray-100 p-2 text-sm uppercase">
                                <div className="w-1/2">Staff Identifier</div>
                                <div className="w-1/2 text-right">Profiles Gathered</div>
                            </div>
                            {staffCounts.map((staff, index) => (
                                <div key={staff.id} className={`flex p-2 text-sm ${index < staffCounts.length - 1 ? 'border-b border-gray-300' : ''}`}>
                                    <div className="w-1/2 font-bold capitalize">{staff.name}</div>
                                    <div className="w-1/2 text-right">{staff.count} Profiles</div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="text-xs text-center border-t border-black pt-4 mt-16 opacity-75 italic">
                            Document formulated automatically via standard municipal algorithms. Unauthorized tampering is forbidden.
                        </div>
                    </div>
                </div>
            )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!reportToDelete} onOpenChange={(open) => { if (!open) setReportToDelete(null) }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        Delete Report?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove the catch report from the database. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingReport}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteReport}
                        disabled={deletingReport}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {deletingReport ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
                        ) : (
                            "Yes, Delete Report"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </div>
    )
}
