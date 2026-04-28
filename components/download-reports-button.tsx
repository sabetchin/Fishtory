"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { exportRecentReports } from "@/app/actions/export-reports"

export function DownloadReportsButton() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleDownload = async () => {
    // Sanitization: Ensure dates are in correct format before passing to server
    const rangeDescription = startDate && endDate 
      ? `from ${startDate} to ${endDate}` 
      : "for the last 30 days";
      
    console.log(`[Download Button] Triggering export ${rangeDescription}...`);
    console.log('[Download Button] Client-side date values:', {
      startDate,
      endDate,
      startDateType: typeof startDate,
      endDateType: typeof endDate,
      startDateLength: startDate?.length,
      endDateLength: endDate?.length
    });
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate)) {
      console.error('[Download Button] Invalid start date format:', startDate);
      toast.error("Invalid Date Format", { description: "Start date must be in YYYY-MM-DD format" });
      return;
    }
    if (endDate && !dateRegex.test(endDate)) {
      console.error('[Download Button] Invalid end date format:', endDate);
      toast.error("Invalid Date Format", { description: "End date must be in YYYY-MM-DD format" });
      return;
    }
    
    setIsDownloading(true)
    
    try {
      const result = await exportRecentReports(startDate, endDate)
      
      console.log('[Download Button] Action Response:', { 
        success: result.success, 
        hasData: result.hasData,
        count: result.count 
      });
      
      // Error handling for server-side failures (db down, etc)
      if (!result.success) {
        throw new Error(result.error || 'Failed to process export')
      }
      
      // Graceful UI handling for empty results
      if (result.hasData === false) {
        toast.info("No Reports Found", {
          description: `There are no records in the system ${rangeDescription}.`
        })
        return;
      }
      
      if (!result.data) {
        throw new Error('Export succeeded but no binary data was returned.')
      }
      
      console.log('[Download Button] Converting data to binary blob...');
      const uint8Array = new Uint8Array(result.data as number[])
      const blob = new Blob([uint8Array], { type: result.mimeType })
      const url = window.URL.createObjectURL(blob)
      
      console.log('[Download Button] Initializing browser download...');
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename || 'catch-reports.xlsx'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Download Started", {
        description: `Successfully exported ${result.count} reports.`
      })
    } catch (error) {
      console.error('[Download Button] Client-side failure:', error)
      toast.error("Export Error", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred during export.'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="grid gap-1.5">
        <Label htmlFor="start-date" className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Start Date
        </Label>
        <Input 
          id="start-date"
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 w-full sm:w-[140px] text-xs bg-white"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="end-date" className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> End Date
        </Label>
        <Input 
          id="end-date"
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 w-full sm:w-[140px] text-xs bg-white"
        />
      </div>
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        size="sm"
        className="flex items-center gap-2 h-9 w-full sm:w-auto px-4"
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Exporting...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download Excel</span>
          </>
        )}
      </Button>
    </div>
  )
}
