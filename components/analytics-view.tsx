"use client"

import { useMemo, useRef, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Printer, Loader2 } from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, subMonths, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, subYears, isSameMonth } from "date-fns"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"

interface Report {
  first_name: string
  last_name: string
  species: string
  weight_kg: number
  location: string
  status: string
  created_at: string
}

export default function AnalyticsView({ reports }: { reports: Report[] }) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Filter only approved reports for analytics
  const approvedReports = useMemo(() => reports.filter(r => r.status === 'approved'), [reports])

  // Weekly Analysis (Last 7 Days)
  const weeklyData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    })

    return last7Days.map(date => {
      const dayName = format(date, 'eee')
      const totalWeight = approvedReports
        .filter(r => isSameDay(new Date(r.created_at), date))
        .reduce((sum, r) => sum + Number(r.weight_kg), 0)
      
      return { name: dayName, weight: totalWeight }
    })
  }, [approvedReports])

  // Monthly Analysis (Current Month)
  const monthlyData = useMemo(() => {
    const start = startOfMonth(new Date())
    const end = endOfMonth(new Date())
    
    // Group by weeks for simplicity
    const weeks = []
    let current = start
    while (current <= end) {
        const weekStart = current
        const weekEnd = endOfWeek(current) > end ? end : endOfWeek(current)
        
        const totalWeight = approvedReports
            .filter(r => {
                const rDate = new Date(r.created_at)
                return rDate >= weekStart && rDate <= weekEnd
            })
            .reduce((sum, r) => sum + Number(r.weight_kg), 0)
        
        weeks.push({
            name: `Week ${weeks.length + 1}`,
            weight: totalWeight
        })
        current = subDays(weekEnd, -1)
    }
    return weeks
  }, [approvedReports])

  // Annual Analysis (Last 12 Months)
  const annualData = useMemo(() => {
    const last12Months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    })

    return last12Months.map(date => {
      const monthName = format(date, 'MMM')
      const totalWeight = approvedReports
        .filter(r => isSameMonth(new Date(r.created_at), date))
        .reduce((sum, r) => sum + Number(r.weight_kg), 0)
      
      return { name: monthName, weight: totalWeight }
    })
  }, [approvedReports])

  // PDF specific data calculations
  const grandTotalCatch = useMemo(() => {
    return approvedReports.reduce((sum, r) => sum + Number(r.weight_kg || 0), 0)
  }, [approvedReports])

  const speciesBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    approvedReports.forEach(r => {
      const sp = r.species || 'Unknown'
      counts[sp] = (counts[sp] || 0) + Number(r.weight_kg || 0)
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // highest to lowest
  }, [approvedReports])

  const exportPDF = async () => {
    setIsGenerating(true)
    setTimeout(async () => {
      const element = document.getElementById("analytics-pdf-container")
      if (element) {
        try {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true })
          const imgData = canvas.toDataURL("image/png")
          const pdf = new jsPDF("p", "mm", "a4")
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width
          
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
          pdf.save(`City_Wide_Analytics_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        } catch (error: any) {
          console.error("PDF Export Error:", error)
          alert("Failed to generate PDF: " + error.message)
        } finally {
          setIsGenerating(false)
        }
      } else {
        setIsGenerating(false)
      }
    }, 500)
  }

  const printReport = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
        <div className="space-y-1">
          <h3 className="font-semibold text-blue-900">Statistical Analysis Reports</h3>
          <p className="text-sm text-muted-foreground">Comprehensive data visualization of catch records</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={printReport} className="flex gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={isGenerating} className="flex gap-2 bg-blue-700 hover:bg-blue-800">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="space-y-8 p-4 bg-white">
        <div className="grid gap-6 md:grid-cols-2">
            {/* Weekly Chart */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Weekly Catch Analysis
                    </CardTitle>
                    <CardDescription>Weight distribution (kg) for the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="weight" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Monthly Chart */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Monthly Catch Analysis
                    </CardTitle>
                    <CardDescription>Weight distribution (kg) by week of current month</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        {/* Annual Chart */}
        <Card className="border-slate-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Annual Catch Trend
                </CardTitle>
                <CardDescription>Long-term catch recording over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="weight" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      {/* Hidden Renderable PDF Blueprint */}
      <div className="fixed -z-50 opacity-0 pointer-events-none top-0 left-0">
        <div id="analytics-pdf-container" className="bg-white text-black font-serif p-10 w-[794px] min-h-[1123px]">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold uppercase">CITY-WIDE AGGREGATE</h1>
              <p className="text-sm">Regional Fisheries Management Office</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Report Date: {format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-xl font-bold underline tracking-wide uppercase">City-Wide Catch Analytics Report</h2>
          </div>

          <div className="mb-10 pl-4" style={{ borderLeft: '4px solid black' }}>
            <h3 className="text-lg font-bold uppercase mb-3">Executive Summary</h3>
            <p className="text-justify leading-relaxed text-sm">
              This document represents the consolidated catch activities strictly authenticated by the municipal office. The data encapsulates all validated regional submissions. The total cumulative weight metrics and the hierarchical breakdown of the dominant species caught during this operational period provide an integral framework for environmental audits and sustainable resource allocation.
            </p>
          </div>

          {/* Core Analytics */}
          <div className="space-y-4 mb-12 text-sm">
            <h3 className="text-lg font-bold uppercase mb-4 border-b border-black pb-2">Core Metrics</h3>
            <div className="flex pb-3 bg-slate-100 p-3 font-bold text-lg">
              <div className="w-2/3 uppercase">Grand Total Catch Volume:</div>
              <div className="w-1/3 text-right">{grandTotalCatch.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</div>
            </div>
            <div className="flex pb-3 pl-3">
              <div className="w-2/3">Total Registered & Validated Submissions:</div>
              <div className="w-1/3 text-right">{approvedReports.length} Reports</div>
            </div>
          </div>

          {/* Species Breakdown */}
          <div className="pl-4 pb-12" style={{ borderLeft: '4px solid black' }}>
            <h3 className="text-lg font-bold uppercase mb-4">Species Yield Distribution</h3>
            <p className="text-xs mb-4 italic text-gray-700">Calculated yield sequenced precisely from maximum to minimum harvested mass.</p>
            
            <div className="border border-black">
              <div className="flex font-bold border-b border-black bg-gray-100 p-2 text-sm uppercase">
                <div className="w-2/3">Species Identity</div>
                <div className="w-1/3 text-right">Aggregate Weight (kg)</div>
              </div>
              {speciesBreakdown.length > 0 ? (
                speciesBreakdown.map(([species, weight], index) => (
                  <div key={species} className={`flex p-2 text-sm ${index < speciesBreakdown.length - 1 ? 'border-b border-gray-300' : ''}`}>
                    <div className="w-2/3 capitalize">{species}</div>
                    <div className="w-1/3 text-right">{weight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center italic text-sm">No catch data available.</div>
              )}
            </div>
          </div>

          <div className="text-xs text-center border-t border-black pt-4 mt-8 opacity-75 italic">
             Document formulated automatically via standard municipal algorithms. Unauthorized tampering is forbidden.
          </div>
        </div>
      </div>
    </div>
  )
}
