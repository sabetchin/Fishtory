"use server"

import { createClient } from "@/lib/supabase/server"
import * as XLSX from 'xlsx'

// Bilingual headers for the Excel file
const BILINGUAL_HEADERS = {
  first_name: 'Name',
  last_name: 'Surname',
  boat_name: 'Boat Name',
  species: 'Species / Uri ng Isda',
  weight_kg: 'Weight (kg) / Timbang (kg)',
  processing_method: 'Processing Method / Paraan ng Pagproseso',
  location: 'Location / Lokasyon',
  status: 'Status / Estado',
  created_at: 'Date / Petsa'
}

// Local language mappings for processing methods
const PROCESSING_METHODS = {
  'fresh': 'Sariwa',
  'smoked': 'Tinapa',
  'dried': 'Tuyo',
  'salted': 'Daing',
  'canned': 'Sardinas'
}

// Local language mappings for status
const STATUS_MAPPING = {
  'pending': 'Nakabinbin',
  'approved': 'Aprubado',
  'rejected': 'Tinanggihan'
}

export async function exportRecentReports(startDate?: string, endDate?: string) {
  console.log(`[Export Action] Starting export process with dates: ${startDate || 'none'} to ${endDate || 'none'}...`);
  try {
    const supabase = await createClient()
    
    // DEBUG: First, fetch ALL records to verify data exists
    console.log('[Export Action] DEBUG: Fetching ALL records to verify data exists...');
    const { data: allRecords, error: allError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('[Export Action] DEBUG: Total records in DB:', allRecords?.length || 0);
    if (allRecords && allRecords.length > 0) {
      console.log('[Export Action] DEBUG: Sample record:', {
        id: allRecords[0].id,
        created_at: allRecords[0].created_at,
        species: allRecords[0].species
      });
    }
    
    let reports: any[] = [];
    let error: any = null;

    if (startDate && endDate) {
      // Fix midnight problem: set end date to 23:59:59 to include all records on that day
      const endDateTime = `${endDate}T23:59:59.999Z`;
      console.log(`[Export Action] Using date range filter: ${startDate} to ${endDateTime}`);
      console.log(`[Export Action] Supabase query: SELECT * FROM reports WHERE created_at >= '${startDate}' AND created_at <= '${endDateTime}' ORDER BY created_at DESC`);
      
      const { data, error: filterError } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDateTime)
        .order('created_at', { ascending: false });
      
      console.log('[Export Action] Filtered query result count:', data?.length || 0);
      
      if (filterError) {
        console.error('[Export Action] Date filter error:', filterError);
        // Fallback: fetch all and filter client-side
        console.log('[Export Action] Falling back to client-side filtering');
        const { data: allData, error: allError } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) {
          error = allError;
        } else if (allData) {
          // Filter client-side
          reports = allData.filter((report: any) => {
            const reportDate = new Date(report.created_at).toISOString().split('T')[0];
            return reportDate >= startDate && reportDate <= endDate;
          });
          console.log(`[Export Action] Client-side filtered to ${reports.length} records`);
        }
      } else {
        reports = data || [];
      }
      
      error = filterError;
    } else {
      // Default to last 30 days if no range is provided
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];
      console.log(`[Export Action] Using default range: since ${defaultStart}`);
      
      const { data, error: defaultError } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', defaultStart)
        .order('created_at', { ascending: false });
      
      reports = data || [];
      error = defaultError;
    }
    
    console.log('[Export Action] Final reports count:', reports.length);
    
    if (error && reports.length === 0) {
      console.error('[Export Action] Supabase query error:', error);
      return { success: false, error: `Database error: ${error.message}` };
    }
    
    // Graceful Return: Return hasData: false instead of throwing error
    if (!reports || reports.length === 0) {
      console.warn('[Export Action] No entries found for specified dates');
      return {
        success: true,
        hasData: false,
        count: 0
      };
    }
    
    console.log(`[Export Action] Success: found ${reports.length} reports.`);
    
    const excelData = reports.map((report: any) => ({
      'Name': report.first_name || 'N/A',
      'Surname': report.last_name || 'N/A',
      'Boat Name / Pangalan ng Bangka': report.boat_name || 'N/A',
      'Species / Uri ng Isda': report.species || 'N/A',
      'Weight (kg) / Timbang (kg)': report.weight_kg || 0,
      'Processing Method / Paraan ng Pagproseso': PROCESSING_METHODS[report.processing_method as keyof typeof PROCESSING_METHODS] || report.processing_method || 'N/A',
      'Location / Lokasyon': report.location || 'N/A',
      'Status / Estado': STATUS_MAPPING[report.status as keyof typeof STATUS_MAPPING] || report.status || 'N/A',
      'Date / Petsa': formatDateForExcel(report.created_at)
    }))
    
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, 
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 18 }
    ]
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Reports')
    
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const dateStamp = startDate && endDate ? `${startDate}_to_${endDate}` : 'last_30_days';
    
    return {
      success: true,
      hasData: true,
      data: Array.from(new Uint8Array(buffer)),
      filename: `catch-reports-${dateStamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      count: reports.length
    }
  } catch (error) {
    console.error('[Export Action] Critical action failure:', error);
    return {
      success: false,
      error: 'A critical error occurred while processing the export.'
    }
  }
}

// Format date for Excel (YYYY-MM-DD format)
function formatDateForExcel(dateString: string): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0] // Returns YYYY-MM-DD
  } catch {
    return dateString
  }
}
