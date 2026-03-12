"use client"

import { useMemo, useRef } from "react"
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
import { Download, FileText, Printer } from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, subMonths, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, subYears, isSameMonth } from "date-fns"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"

interface Report {
  id: string
  fisherman_id: string
  species: string
  weight_kg: number
  location: string
  status: string
  created_at: string
}

export default function AnalyticsView({ reports }: { reports: Report[] }) {
  const reportRef = useRef<HTMLDivElement>(null)

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

  const exportPDF = async () => {
    if (!reportRef.current) return
    
    try {
      console.log("Starting PDF export with html2canvas-pro...")
      // Show simple feedback
      const btn = document.activeElement as HTMLButtonElement
      const originalText = btn?.innerText || "Download PDF"
      if (btn) {
        btn.innerText = "Generating..."
        btn.disabled = true
      }

      // Capture the element
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200 
      })

      // Manually convert canvas to grayscale for B&W report
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          data[i] = avg     // R
          data[i + 1] = avg // G
          data[i + 2] = avg // B
        }
        ctx.putImageData(imageData, 0, 0)
      }

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgProps = pdf.getImageProperties(imgData)
      const ratio = Math.min(pdfWidth / imgProps.width, (pdfHeight - 20) / imgProps.height)
      const width = imgProps.width * ratio
      const height = imgProps.height * ratio
      
      const x = (pdfWidth - width) / 2
      const y = 10 

      pdf.addImage(imgData, 'PNG', x, y, width, height)
      pdf.save(`Fishtory_BW_Analysis_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      
      // Feedback
      if (btn) {
        btn.innerText = originalText
        btn.disabled = false
      }
      console.log("PDF export complete.")
    } catch (error: any) {
      console.error("PDF Export Error:", error)
      alert("Failed to generate PDF: " + error.message)
      const btn = document.activeElement as HTMLButtonElement
      if (btn) {
        btn.disabled = false
        btn.innerText = "Download PDF"
      }
    }
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
          <Button size="sm" onClick={exportPDF} className="flex gap-2 bg-blue-700 hover:bg-blue-800">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-8 p-4 bg-white">
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

        {/* PDF Metadata (Visible only on top of PDF/Print or hidden if desired) */}
        <div className="hidden print:block border-t pt-4 mt-8">
            <p className="text-xs text-slate-500 text-center">
                Generated by Fishtory Management System - {format(new Date(), 'PPPP p')}
            </p>
        </div>
      </div>
    </div>
  )
}
