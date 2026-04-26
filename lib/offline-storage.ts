/**
 * Offline Storage using IndexedDB via idb-keyval
 * Stores pending catch reports for sync when connection is restored
 */

import { set, get, del, keys, createStore } from 'idb-keyval'

// Create a custom store for Fishtory offline data
const offlineStore = createStore('fishtory-offline-db', 'catch-reports')

export interface PendingCatchReport {
  id: string
  fisherman_id: string
  user_id: string
  boat_name: string
  species: string
  weight_kg: number
  processing_method: string
  location: string
  transcript?: string
  created_at: string
  sync_status: 'pending' | 'syncing' | 'failed'
  sync_attempts: number
  last_sync_attempt?: string
}

/**
 * Save a pending catch report to IndexedDB
 */
export async function savePendingReport(report: Omit<PendingCatchReport, 'id' | 'created_at' | 'sync_status' | 'sync_attempts'>): Promise<string> {
  const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const pendingReport: PendingCatchReport = {
    ...report,
    id,
    created_at: new Date().toISOString(),
    sync_status: 'pending',
    sync_attempts: 0
  }
  
  await set(id, pendingReport, offlineStore)
  return id
}

/**
 * Get all pending reports from IndexedDB
 */
export async function getPendingReports(): Promise<PendingCatchReport[]> {
  const allKeys = await keys(offlineStore)
  const reports: PendingCatchReport[] = []
  
  for (const key of allKeys) {
    const report = await get(key, offlineStore)
    if (report && report.sync_status === 'pending') {
      reports.push(report)
    }
  }
  
  // Sort by creation date (oldest first)
  return reports.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

/**
 * Get a specific pending report by ID
 */
export async function getPendingReport(id: string): Promise<PendingCatchReport | undefined> {
  return await get(id, offlineStore)
}

/**
 * Update sync status of a pending report
 */
export async function updateReportSyncStatus(
  id: string, 
  status: 'pending' | 'syncing' | 'failed',
  syncAttempts?: number
): Promise<void> {
  const report = await get(id, offlineStore)
  if (report) {
    report.sync_status = status
    report.sync_attempts = syncAttempts ?? report.sync_attempts
    report.last_sync_attempt = new Date().toISOString()
    await set(id, report, offlineStore)
  }
}

/**
 * Delete a pending report after successful sync
 */
export async function deletePendingReport(id: string): Promise<void> {
  await del(id, offlineStore)
}

/**
 * Clear all pending reports (use with caution)
 */
export async function clearAllPendingReports(): Promise<void> {
  const allKeys = await keys(offlineStore)
  for (const key of allKeys) {
    await del(key, offlineStore)
  }
}

/**
 * Get count of pending reports
 */
export async function getPendingReportsCount(): Promise<number> {
  const reports = await getPendingReports()
  return reports.length
}

/**
 * Get failed reports for retry
 */
export async function getFailedReports(): Promise<PendingCatchReport[]> {
  const allKeys = await keys(offlineStore)
  const reports: PendingCatchReport[] = []
  
  for (const key of allKeys) {
    const report = await get(key, offlineStore)
    if (report && report.sync_status === 'failed') {
      reports.push(report)
    }
  }
  
  return reports.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}
