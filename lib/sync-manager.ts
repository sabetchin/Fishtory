/**
 * Sync Manager - Handles background synchronization of pending reports
 * Detects network connectivity and syncs data to Supabase when online
 */

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import {
  getPendingReports,
  updateReportSyncStatus,
  deletePendingReport,
  getPendingReportsCount,
  PendingCatchReport
} from './offline-storage'

export interface SyncStatus {
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: string | null
  syncInProgress: number
}

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null
  private isSyncing = false
  private listeners: Set<(status: SyncStatus) => void> = new Set()
  private lastSyncTime: string | null = null

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
  }

  private handleOnline = () => {
    console.log('Network connection restored. Starting sync...')
    this.startSync()
  }

  private handleOffline = () => {
    console.log('Network connection lost. Pausing sync.')
    this.stopSync()
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    const status: SyncStatus = {
      isSyncing: this.isSyncing,
      pendingCount: 0, // Will be updated during sync
      lastSyncTime: this.lastSyncTime,
      syncInProgress: 0
    }
    this.listeners.forEach(listener => listener(status))
  }

  /**
   * Start automatic sync (runs every 30 seconds when online)
   */
  startAutoSync(intervalMs: number = 30000) {
    this.stopAutoSync()
    
    if (typeof window !== 'undefined' && navigator.onLine) {
      this.syncInterval = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.startSync()
        }
      }, intervalMs)
    }
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Stop sync (for manual intervention)
   */
  stopSync() {
    this.isSyncing = false
    this.notifyListeners()
  }

  /**
   * Start sync process
   */
  async startSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return
    }

    if (!navigator.onLine) {
      console.log('Offline - skipping sync')
      return
    }

    this.isSyncing = true
    this.notifyListeners()

    try {
      const pendingReports = await getPendingReports()
      
      if (pendingReports.length === 0) {
        console.log('No pending reports to sync')
        this.isSyncing = false
        this.notifyListeners()
        return
      }

      console.log(`Syncing ${pendingReports.length} pending reports...`)

      // Update listeners with count
      this.listeners.forEach(listener => 
        listener({
          isSyncing: true,
          pendingCount: pendingReports.length,
          lastSyncTime: this.lastSyncTime,
          syncInProgress: 0
        })
      )

      let syncedCount = 0
      let failedCount = 0

      for (const report of pendingReports) {
        try {
          // Mark as syncing
          await updateReportSyncStatus(report.id, 'syncing')

          // Sync to Supabase
          const { error } = await supabase.from('reports').insert({
            fisherman_id: report.fisherman_id,
            user_id: report.user_id,
            boat_name: report.boat_name,
            species: report.species,
            weight_kg: report.weight_kg,
            processing_method: report.processing_method,
            location: report.location,
            status: 'pending',
            created_at: report.created_at
          })

          if (error) {
            throw error
          }

          // Success - delete from local storage
          await deletePendingReport(report.id)
          syncedCount++

          console.log(`Synced report ${report.id}`)

        } catch (error) {
          console.error(`Failed to sync report ${report.id}:`, error)
          
          // Mark as failed
          const newAttempts = report.sync_attempts + 1
          await updateReportSyncStatus(report.id, 'failed', newAttempts)
          
          // If too many failures, consider deleting (optional)
          if (newAttempts >= 5) {
            console.warn(`Report ${report.id} failed ${newAttempts} times. Keeping for manual review.`)
          }
          
          failedCount++
        }

        // Update progress
        this.listeners.forEach(listener => 
          listener({
            isSyncing: true,
            pendingCount: pendingReports.length - syncedCount,
            lastSyncTime: this.lastSyncTime,
            syncInProgress: syncedCount
          })
        )
      }

      this.lastSyncTime = new Date().toISOString()
      console.log(`Sync complete: ${syncedCount} synced, ${failedCount} failed`)

    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      this.isSyncing = false
      this.notifyListeners()
    }
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const pendingCount = await getPendingReportsCount()
    return {
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: 0
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoSync()
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
    this.listeners.clear()
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager()
  }
  return syncManagerInstance
}

/**
 * React hook for sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncInProgress: 0
  })

  useEffect(() => {
    const manager = getSyncManager()
    
    // Get initial status
    manager.getStatus().then(setStatus)
    
    // Subscribe to updates
    const unsubscribe = manager.subscribe(setStatus)
    
    // Start auto-sync
    manager.startAutoSync()
    
    return () => {
      unsubscribe()
      manager.stopAutoSync()
    }
  }, [])

  return status
}
