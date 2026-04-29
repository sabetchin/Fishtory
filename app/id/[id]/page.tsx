"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Fish, MapPin, Anchor, Phone, ShieldCheck, Loader2 } from "lucide-react"

interface FishermanProfile {
    fisherman_id: string
    first_name: string
    last_name: string
    boat_name: string
    location: string
    phone_number: string
}

interface CatchStats {
    grandTotal: number
    totalReports: number
    topSpecies: string
    leastSpecies: string
}

export default function FishermanPublicProfile() {
    const params = useParams()
    const id = params.id as string

    const [profile, setProfile] = useState<FishermanProfile | null>(null)
    const [stats, setStats] = useState<CatchStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return

        const fetchProfileData = async () => {
            setLoading(true)
            
            // 1. Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from("fishermen_profiles")
                .select("*")
                .eq("fisherman_id", id)
                .single()

            if (profileError || !profileData) {
                console.error("Error fetching profile:", profileError)
                setLoading(false)
                return
            }

            setProfile(profileData)

            // 2. Fetch Reports using user_id if we have it, else try fisherman_id
            let reportsQuery = supabase.from("reports").select("*")
            if (profileData.user_id) {
                reportsQuery = reportsQuery.eq("user_id", profileData.user_id)
            } else {
                reportsQuery = reportsQuery.eq("fisherman_id", id)
            }

            const { data: reports } = await reportsQuery

            let grandTotal = 0
            let totalReports = 0
            let topSpecies = "N/A"
            let leastSpecies = "N/A"

            if (reports && reports.length > 0) {
                totalReports = reports.length
                const speciesCount: Record<string, number> = {}
                
                reports.forEach((r: any) => {
                    if (r.status === 'approved') {
                        grandTotal += Number(r.weight_kg || 0)
                        const sp = r.species || 'Unknown'
                        speciesCount[sp] = (speciesCount[sp] || 0) + Number(r.weight_kg || 0)
                    }
                })

                const entries = Object.entries(speciesCount).sort((a, b) => b[1] - a[1])
                if (entries.length > 0) {
                    topSpecies = entries[0][0]
                    leastSpecies = entries[entries.length - 1][0]
                }
            }

            setStats({
                grandTotal,
                totalReports,
                topSpecies,
                leastSpecies
            })

            setLoading(false)
        }

        fetchProfileData()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-red-600 flex justify-center items-center gap-2">
                            Fisherman Not Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-slate-500">
                        The requested fisherman profile could not be found or does not exist.
                    </CardContent>
                </Card>
            </div>
        )
    }

    const fullName = `${profile.first_name} ${profile.last_name}`
    const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("").toUpperCase()

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 flex justify-center items-start">
            <div className="max-w-md w-full space-y-6">
                
                {/* Profile Card */}
                <Card className="border-blue-100 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Fish className="w-32 h-32" />
                        </div>
                        
                        <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 z-10 border-4 border-blue-100">
                            <span className="text-blue-700 text-3xl font-bold">{initials}</span>
                        </div>
                        
                        <h1 className="text-2xl font-bold text-white z-10">{fullName}</h1>
                        <p className="text-blue-100 font-medium z-10">{profile.fisherman_id}</p>
                        
                        <div className="mt-4 inline-flex items-center gap-1.5 bg-blue-800/40 px-3 py-1 rounded-full border border-blue-400/30 backdrop-blur-sm z-10">
                            <ShieldCheck className="w-4 h-4 text-blue-200" />
                            <span className="text-xs text-blue-100 font-semibold tracking-wide uppercase">Verified Profile</span>
                        </div>
                    </div>
                    
                    <CardContent className="p-6 space-y-4 bg-white">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Anchor className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Vessel Name</p>
                                    <p className="text-slate-800 font-semibold">{profile.boat_name || "N/A"}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Home Port / Location</p>
                                    <p className="text-slate-800 font-semibold">{profile.location || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Contact</p>
                                    <p className="text-slate-800 font-semibold">{profile.phone_number || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                {stats && (
                    <Card className="border-emerald-100 shadow-md">
                        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                            <CardTitle className="text-emerald-800 flex items-center gap-2 text-lg">
                                <Fish className="w-5 h-5 text-emerald-600" />
                                Catch Statistics
                            </CardTitle>
                            <CardDescription className="text-emerald-600/80">
                                Aggregated data from approved reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-2 divide-x divide-y divide-emerald-50">
                                <div className="p-5 flex flex-col justify-center items-center text-center">
                                    <p className="text-3xl font-bold text-emerald-600 mb-1">{stats.grandTotal.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Catch (kg)</p>
                                </div>
                                <div className="p-5 flex flex-col justify-center items-center text-center">
                                    <p className="text-3xl font-bold text-blue-600 mb-1">{stats.totalReports}</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Reports Logged</p>
                                </div>
                                <div className="p-5 flex flex-col justify-center items-center text-center">
                                    <p className="text-lg font-bold text-slate-700 mb-1 capitalize truncate w-full">{stats.topSpecies}</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Top Species</p>
                                </div>
                                <div className="p-5 flex flex-col justify-center items-center text-center">
                                    <p className="text-lg font-bold text-slate-700 mb-1 capitalize truncate w-full">{stats.leastSpecies}</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Least Species</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
