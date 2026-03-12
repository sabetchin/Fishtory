"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserProfile } from "@/components/user-profile"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase. Assume we have env vars set up.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function FishermanDashboard() {
    const [activeTab, setActiveTab] = useState("new-report")
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [reports, setReports] = useState<any[]>([])

    // Form state
    const [boatName, setBoatName] = useState("")
    const [species, setSpecies] = useState("")
    const [weight, setWeight] = useState("")
    const [processingMethod, setProcessingMethod] = useState("")
    const [location, setLocation] = useState("")

    useEffect(() => {
        // Fetch current user and their reports
        const fetchUserAndReports = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUser(session.user)
                fetchReports(session.user.id)
            }
        }
        fetchUserAndReports()
    }, [activeTab]) // Re-fetch when switching tabs

    const fetchReports = async (userId: string) => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setReports(data)
        }
    }

    const handleSubmit = async () => {
        if (!user) return alert("You must be logged in to submit a report.")
        if (!boatName || !species || !weight || !processingMethod || !location) {
            return alert("Please fill in all fields.")
        }

        setLoading(true)

        const fishermanId = user.user_metadata?.fisherman_id || 'Unknown'

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
            console.error(error)
            alert("Failed to submit report. Error: " + error.message)
        } else {
            alert("Report submitted successfully!")
            // Reset form
            setBoatName("")
            setSpecies("")
            setWeight("")
            setProcessingMethod("")
            setLocation("")
            // Switch to reports tab to see it
            setActiveTab("my-reports")
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

    // Helper for status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-green-600'
            case 'rejected': return 'text-red-600'
            default: return 'text-yellow-600'
        }
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-blue-900 border-b-4 border-blue-500 pb-2 inline-block">Fishtory Dashboard</h1>
                <UserProfile />
            </div>

            <Tabs value={activeTab} defaultValue="submit" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                    <TabsTrigger value="new-report">New Catch Report</TabsTrigger>
                    <TabsTrigger value="my-reports">My Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="new-report">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submit Catch Report / Mag-submit ng Ulat</CardTitle>
                            <CardDescription>
                                Fill out the details below. Takes less than 1 minute.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Fisherman ID</Label>
                                    <Input value={user?.user_metadata?.fisherman_id || "Loading..."} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Boat Name / Pangalan ng Bangka</Label>
                                    <Input 
                                        placeholder="Enter boat name" 
                                        value={boatName}
                                        onChange={(e) => setBoatName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Fish Species / Uri ng Isda</Label>
                                <Select value={species} onValueChange={setSpecies}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select fish / Pumili ng isda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bangus">Bangus (Milkfish)</SelectItem>
                                        <SelectItem value="tilapia">Tilapia</SelectItem>
                                        <SelectItem value="lapu-lapu">Lapu-lapu (Grouper)</SelectItem>
                                        <SelectItem value="dilis">Dilis (Anchovies)</SelectItem>
                                        <SelectItem value="sardinas">Sardinas (Sardines)</SelectItem>
                                        <SelectItem value="tuna">Tuna</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Weight (kg) / Bigat</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="0.0" 
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Processing / Pagproseso</Label>
                                    <Select value={processingMethod} onValueChange={setProcessingMethod}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select process / Pumili ng proseso" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fresh">Fresh / Sariwa</SelectItem>
                                            <SelectItem value="smoked">Smoked / Tinapa</SelectItem>
                                            <SelectItem value="dried">Dried / Tuyo</SelectItem>
                                            <SelectItem value="salted">Salted / Daing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Location / Lokasyon</Label>
                                <Select value={location} onValueChange={setLocation}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location / Pumili ng lokasyon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Banicain">Banicain</SelectItem>
                                        <SelectItem value="Barretto">Barretto</SelectItem>
                                        <SelectItem value="Kalaklan">Kalaklan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full md:w-auto" 
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? "Submitting..." : "Submit Report / Ipasa ang Ulat"}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="my-reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report History</CardTitle>
                            <CardDescription>
                                View the status of your submitted reports.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Fish</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                No reports found. Submit your first catch report!
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reports.map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell>{formatDate(report.created_at)}</TableCell>
                                                <TableCell className="capitalize">{report.species}</TableCell>
                                                <TableCell>{report.weight_kg} kg</TableCell>
                                                <TableCell className={`${getStatusColor(report.status)} font-medium capitalize`}>
                                                    {report.status}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
