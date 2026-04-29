"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import QRCode from "react-qr-code"
import { Printer, Fish, ShieldCheck, Loader2 } from "lucide-react"

interface FishermanProfile {
    fisherman_id: string
    first_name: string
    last_name: string
    boat_name: string
    contact_number: string
    location: string
    email: string
    issued_year: string
    stats?: {
        grandTotal: number;
        totalReports: number;
        topSpecies: string;
        leastSpecies: string;
    }
}

export function DigitalIdCard() {
    const [profile, setProfile] = useState<FishermanProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [isFlipped, setIsFlipped] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const meta = user.user_metadata || {}

            // Try to get more data from fishermen_profiles table
            const { data: profileRow } = await supabase
                .from("fishermen_profiles")
                .select("*")
                .eq("user_id", user.id)
                .single()

            // Fetch reports for stats
            const { data: reports } = await supabase
                .from("reports")
                .select("*")
                .eq("user_id", user.id)

            let grandTotal = 0;
            let totalReports = 0;
            let topSpecies = "N/A";
            let leastSpecies = "N/A";

            if (reports && reports.length > 0) {
                totalReports = reports.length;
                const speciesCount: Record<string, number> = {};
                reports.forEach((r: any) => {
                    if (r.status === 'approved') {
                        grandTotal += Number(r.weight_kg || 0);
                        const sp = r.species || 'Unknown';
                        speciesCount[sp] = (speciesCount[sp] || 0) + Number(r.weight_kg || 0);
                    }
                });

                const entries = Object.entries(speciesCount).sort((a, b) => b[1] - a[1]);
                if (entries.length > 0) {
                    topSpecies = entries[0][0];
                    leastSpecies = entries[entries.length - 1][0];
                }
            }

            const yearStr = meta.fisherman_id
                ? meta.fisherman_id.split("-")[1] || new Date().getFullYear().toString()
                : new Date().getFullYear().toString()

            setProfile({
                fisherman_id: meta.fisherman_id || "—",
                first_name: profileRow?.first_name || meta.first_name || "",
                last_name: profileRow?.last_name || meta.last_name || "",
                boat_name: profileRow?.boat_name || meta.boat_name || "—",
                contact_number: profileRow?.contact_number || meta.contact_number || "—",
                location: profileRow?.location || meta.location || "—",
                email: user.email || "—",
                issued_year: yearStr,
                stats: {
                    grandTotal,
                    totalReports,
                    topSpecies,
                    leastSpecies
                }
            })
            setLoading(false)
        }
        fetchProfile()
    }, [])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!profile || profile.fisherman_id === "—") {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <ShieldCheck className="h-10 w-10 text-slate-300" />
                <p className="text-slate-500 font-medium">No Fisherman ID found.</p>
                <p className="text-slate-400 text-sm">Complete your profile first to generate your ID.</p>
            </div>
        )
    }

    const fullName = `${profile.first_name} ${profile.last_name}`.trim() || "—"
    const initials = [profile.first_name[0], profile.last_name[0]].filter(Boolean).join("").toUpperCase()

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Print button — hidden during print */}
            <div className="flex items-center gap-3 no-print">
                <p className="text-sm text-slate-500">Your official Fisherman ID card — ready to print.</p>
                <Button
                    onClick={handlePrint}
                    className="bg-blue-700 hover:bg-blue-800 flex items-center gap-2"
                >
                    <Printer className="h-4 w-4" />
                    Print ID Card
                </Button>
            </div>

            {/* ── 3D FLIP CONTAINER ── */}
            <div 
                className="relative w-[380px] h-[220px] cursor-pointer group no-print-flip"
                style={{ perspective: "1000px" }}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div 
                    className={`w-full h-full transition-transform duration-700 shadow-2xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}
                    style={{ transformStyle: "preserve-3d" }}
                    id="fisherman-id-card-container"
                >
                    {/* ── FRONT OF CARD ── */}
                    <div 
                        className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden border border-blue-200 bg-white select-none id-card-front"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        {/* Header band */}
                        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-5 py-4 flex items-center gap-3">
                            <Fish className="h-7 w-7 text-white/90 shrink-0" />
                            <div>
                                <p className="text-white font-bold text-base leading-tight tracking-wide">FISHTORY</p>
                                <p className="text-blue-200 text-[10px] font-medium tracking-widest uppercase">Fisherman Registry System</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-blue-200 text-[9px] tracking-widest uppercase">Official ID</p>
                                <p className="text-white text-[10px] font-semibold">{profile.issued_year}</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-5 flex gap-4 h-[120px]">
                            {/* Avatar circle */}
                            <div className="shrink-0 flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center shadow-md">
                                    <span className="text-white text-2xl font-bold tracking-tight">{initials || "FM"}</span>
                                </div>
                                {/* Fisherman ID pill */}
                                <span className="text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-2 py-0.5 tracking-wider text-center">
                                    {profile.fisherman_id}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-1.5 min-w-0">
                                <p className="text-blue-900 font-bold text-lg leading-tight truncate">{fullName}</p>
                                <p className="text-blue-500 text-[10px] font-semibold uppercase tracking-widest">Licensed Fisherman</p>

                                <div className="pt-1 space-y-1">
                                    <InfoRow label="Boat" value={profile.boat_name} />
                                    <InfoRow label="Location" value={profile.location} />
                                    <InfoRow label="Contact" value={profile.contact_number} />
                                </div>
                            </div>
                        </div>

                        {/* Footer strip */}
                        <div className="bg-blue-50 border-t border-blue-100 px-5 py-2 flex items-center justify-between absolute bottom-0 w-full">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                <span className="text-[10px] text-blue-600 font-semibold tracking-wide uppercase">Verified</span>
                            </div>
                            <p className="text-[9px] text-slate-400 tracking-wider">
                                Click to view QR Code
                            </p>
                        </div>
                    </div>

                    {/* ── BACK OF CARD (QR CODE) ── */}
                    <div 
                        className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-white select-none id-card-back flex flex-col items-center justify-center rotate-y-180"
                        style={{ backfaceVisibility: "hidden", transform: 'rotateY(180deg)' }}
                    >
                        <div className="absolute top-0 w-full bg-slate-100 border-b border-slate-200 px-4 py-2 text-center">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Scan for Registration Details</p>
                        </div>
                        
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mt-6 pointer-events-none">
                            <QRCode 
                                value={typeof window !== 'undefined' ? `${window.location.origin}/id/${profile.fisherman_id}` : `https://fishtory.com/id/${profile.fisherman_id}`}
                                size={110}
                                level="M"
                            />
                        </div>
                        
                        <p className="text-[10px] text-slate-400 mt-3 tracking-widest uppercase">ID: {profile.fisherman_id}</p>
                        <p className="text-[9px] text-slate-300 absolute bottom-3">Property of Fishtory Registry</p>
                    </div>
                </div>
            </div>

            {/* Print hint */}
            <p className="text-xs text-slate-400 no-print mt-2">
                Tip: Click the card to flip between your Info and your QR Code.
            </p>

            {/* Print-only styles injected via style tag */}
            <style>{`
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                
                @media print {
                    body * { visibility: hidden !important; }
                    /* Make front and back print nicely stacked */
                    #fisherman-id-card-container {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        transform: none !important;
                        width: 100% !important;
                    }
                    
                    .id-card-front, .id-card-back {
                        visibility: visible !important;
                        position: relative !important;
                        transform: none !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 20px !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    
                    .id-card-front *, .id-card-back * {
                        visibility: visible !important;
                    }

                    .no-print, .no-print-flip { 
                        transform: none !important; 
                        perspective: none !important; 
                    }
                }
            `}</style>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-14 shrink-0">{label}</span>
            <span className="text-xs text-slate-700 font-medium truncate">{value || "—"}</span>
        </div>
    )
}
