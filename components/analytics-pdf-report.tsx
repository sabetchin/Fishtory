"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText, Printer } from "lucide-react"
import { useState, useRef } from "react"
import jsPDF from "jspdf"
import { useReactToPrint } from "react-to-print"

interface ReportData {
  fisherman_name: string
  email: string
  fisherman_id: string
  total_catches: number
  total_weight: number
  most_common_species: string
  average_weight: number
  date_range: string
  executive_summary: string
  location: string
  processing_methods: string[]
}

interface AnalyticsPDFReportProps {
  data: ReportData
  fileName?: string
}

export function AnalyticsPDFReport({ data, fileName = "analytics-report" }: AnalyticsPDFReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const generatePDF = () => {
    setIsGenerating(true)
    
    try {
      // Create PDF document (A4 size, portrait)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)

      // Set font - Times New Roman for official government document look
      doc.setFont("times", "normal")
      doc.setFontSize(12)

      // Current date for header
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })

      // ========== HEADER SECTION ==========
      // Left side: Fisherman's name and email
      doc.setFont("times", "bold")
      doc.setFontSize(14)
      doc.text(data.fisherman_name, margin, 30)
      
      doc.setFont("times", "normal")
      doc.setFontSize(11)
      doc.text(data.email, margin, 38)
      doc.text(`Fisherman ID: ${data.fisherman_id}`, margin, 46)

      // Right side: Date
      doc.setFont("times", "normal")
      doc.setFontSize(11)
      doc.text(currentDate, pageWidth - margin, 30, { align: "right" })

      // Clean horizontal rule under header
      doc.setLineWidth(0.5)
      doc.line(margin, 55, pageWidth - margin, 55)

      // ========== TITLE ==========
      doc.setFont("times", "bold")
      doc.setFontSize(16)
      doc.text("CATCH ANALYSIS REPORT", margin, 72)

      // ========== EXECUTIVE SUMMARY SECTION ==========
      doc.setFont("times", "bold")
      doc.setFontSize(13)
      doc.text("EXECUTIVE SUMMARY", margin, 90)

      doc.setFont("times", "normal")
      doc.setFontSize(11)
      
      // Word wrap for executive summary
      const splitSummary = doc.splitTextToSize(data.executive_summary, contentWidth)
      doc.text(splitSummary, margin, 100)

      // Calculate Y position after summary
      let currentY = 100 + (splitSummary.length * 6) + 15

      // ========== DATA GRID SECTION ==========
      doc.setFont("times", "bold")
      doc.setFontSize(13)
      doc.text("CORE ANALYTICS DATA", margin, currentY)
      currentY += 10

      // Draw grid box
      const gridStartY = currentY + 5
      const gridHeight = 70
      doc.setLineWidth(0.3)
      doc.rect(margin, gridStartY, contentWidth, gridHeight)

      // Grid data rows
      doc.setFont("times", "normal")
      doc.setFontSize(11)
      
      const gridData = [
        { label: "Total Catches Recorded", value: data.total_catches.toString() },
        { label: "Total Weight (kg)", value: data.total_weight.toFixed(2) },
        { label: "Most Common Species", value: data.most_common_species },
        { label: "Average Weight per Catch (kg)", value: data.average_weight.toFixed(2) },
        { label: "Primary Location", value: data.location },
        { label: "Report Period", value: data.date_range }
      ]

      const rowHeight = 11
      gridData.forEach((row, index) => {
        const y = gridStartY + 8 + (index * rowHeight)
        
        // Label (left)
        doc.setFont("times", "bold")
        doc.text(row.label, margin + 5, y)
        
        // Value (right)
        doc.setFont("times", "normal")
        doc.text(row.value, pageWidth - margin - 5, y, { align: "right" })
        
        // Horizontal line between rows (except last)
        if (index < gridData.length - 1) {
          doc.setLineWidth(0.2)
          doc.line(margin, y + 4, pageWidth - margin, y + 4)
        }
      })

      currentY = gridStartY + gridHeight + 15

      // ========== PROCESSING METHODS SECTION ==========
      doc.setFont("times", "bold")
      doc.setFontSize(13)
      doc.text("PROCESSING METHODS", margin, currentY)
      currentY += 10

      doc.setFont("times", "normal")
      doc.setFontSize(11)
      const methodsText = data.processing_methods.length > 0 
        ? data.processing_methods.join(", ")
        : "No processing methods recorded"
      
      const splitMethods = doc.splitTextToSize(methodsText, contentWidth)
      doc.text(splitMethods, margin, currentY)
      currentY += (splitMethods.length * 6) + 15

      // ========== FOOTER ==========
      doc.setFont("times", "italic")
      doc.setFontSize(9)
      doc.text(
        "This document is an official record generated by the Fishtory Agricultural Management System",
        margin,
        pageHeight - 20
      )
      doc.text(
        "For official use only. Unauthorized reproduction is prohibited.",
        margin,
        pageHeight - 12
      )

      // Save the PDF
      doc.save(`${fileName}-${Date.now()}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: fileName,
    onBeforePrint: async () => { console.log("Preparing document for printing..."); },
    onAfterPrint: () => console.log("Document printed successfully"),
  })

  return (
    <div className="flex gap-2">
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        className="bg-slate-800 hover:bg-slate-900 text-white"
      >
        {isGenerating ? (
          <>
            <FileText className="h-4 w-4 mr-2 animate-pulse" />
            Generating...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>
      
      <Button
        onClick={() => handlePrint()}
        variant="outline"
        className="border-slate-800 text-slate-800 hover:bg-slate-100"
      >
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>

      {/* Hidden printable section for React-To-Print */}
      <div ref={printRef} className="hidden print:block">
        <div className="font-serif text-black p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold">{data.fisherman_name}</h1>
              <p className="text-sm mt-1">{data.email}</p>
              <p className="text-sm">Fisherman ID: {data.fisherman_id}</p>
            </div>
            <div className="text-sm">
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </div>
          </div>
          
          <hr className="border-black mb-6" />
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-8">CATCH ANALYSIS REPORT</h2>
          
          {/* Executive Summary */}
          <h3 className="text-lg font-bold mb-3">EXECUTIVE SUMMARY</h3>
          <p className="text-sm leading-relaxed mb-8">{data.executive_summary}</p>
          
          {/* Data Grid */}
          <h3 className="text-lg font-bold mb-3">CORE ANALYTICS DATA</h3>
          <div className="border border-black mb-8">
            {[
              { label: "Total Catches Recorded", value: data.total_catches },
              { label: "Total Weight (kg)", value: data.total_weight.toFixed(2) },
              { label: "Most Common Species", value: data.most_common_species },
              { label: "Average Weight per Catch (kg)", value: data.average_weight.toFixed(2) },
              { label: "Primary Location", value: data.location },
              { label: "Report Period", value: data.date_range }
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-2 px-4 border-b border-black last:border-b-0">
                <span className="font-bold">{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
          
          {/* Processing Methods */}
          <h3 className="text-lg font-bold mb-3">PROCESSING METHODS</h3>
          <p className="text-sm mb-12">
            {data.processing_methods.length > 0 ? data.processing_methods.join(", ") : "No processing methods recorded"}
          </p>
          
          {/* Footer */}
          <div className="text-xs italic text-center border-t border-black pt-4">
            <p>This document is an official record generated by the Fishtory Agricultural Management System</p>
            <p>For official use only. Unauthorized reproduction is prohibited.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to fetch and format data from Supabase
export async function fetchAnalyticsReportData(supabase: any, userId: string, fishermanId?: string, startDate?: string, endDate?: string): Promise<ReportData> {
  // Fetch user data
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  
  // Fetch reports data
  let query = supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
  
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate)
  }
  
  const { data: reports } = await query.order('created_at', { ascending: false })

  // Calculate metrics
  const totalCatches = reports?.length || 0
  const totalWeight = reports?.reduce((sum: number, r: any) => sum + (r.weight_kg || 0), 0) || 0
  const averageWeight = totalCatches > 0 ? totalWeight / totalCatches : 0
  
  // Find most common species
  const speciesCount: Record<string, number> = {}
  reports?.forEach((r: any) => {
    if (r.species) {
      speciesCount[r.species] = (speciesCount[r.species] || 0) + 1
    }
  })
  const mostCommonSpecies = Object.entries(speciesCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"

  // Find most common location
  const locationCount: Record<string, number> = {}
  reports?.forEach((r: any) => {
    if (r.location) {
      locationCount[r.location] = (locationCount[r.location] || 0) + 1
    }
  })
  const primaryLocation = Object.entries(locationCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"

  // Get unique processing methods
  const processingMethodsSet = new Set<string>()
  reports?.forEach((r: any) => {
    if (r.processing_method) {
      processingMethodsSet.add(r.processing_method)
    }
  })
  const processingMethods = Array.from(processingMethodsSet)

  // Format date range
  const dateRange = startDate && endDate 
    ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
    : "All time"

  // Generate executive summary
  const executiveSummary = `This catch analysis report provides a comprehensive overview of fishing activities for ${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name || 'the fisherman'} (ID: ${fishermanId || 'N/A'}). During the reporting period of ${dateRange}, a total of ${totalCatches} catches were recorded with a combined weight of ${totalWeight.toFixed(2)} kilograms. The primary fishing location was ${primaryLocation}, with ${mostCommonSpecies} being the most frequently caught species. The average catch weight was ${averageWeight.toFixed(2)} kilograms. Processing methods utilized include ${processingMethods.length > 0 ? processingMethods.join(', ') : 'none recorded'}. This data serves as an official record of fishing productivity and compliance for agricultural management purposes.`

  return {
    fisherman_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || "Unknown Fisherman",
    email: user?.email || "N/A",
    fisherman_id: fishermanId || user?.user_metadata?.fisherman_id || "N/A",
    total_catches: totalCatches,
    total_weight: totalWeight,
    most_common_species: mostCommonSpecies,
    average_weight: averageWeight,
    date_range: dateRange,
    executive_summary: executiveSummary,
    location: primaryLocation,
    processing_methods: processingMethods
  }
}
