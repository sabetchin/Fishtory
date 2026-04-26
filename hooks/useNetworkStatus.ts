"use client"

import { useState, useEffect } from 'react'

interface NetworkStatus {
  isOnline: boolean
  since: Date | null
  rtt: number | null
  type: string | null
  downlink: number | null
  saveData: boolean | null
  downlinkMax: number | null
  effectiveType: string | null
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    since: null,
    rtt: null,
    type: null,
    downlink: null,
    saveData: null,
    downlinkMax: null,
    effectiveType: null
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const updateOnlineStatus = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        since: new Date()
      }))
    }

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection) {
        setStatus(prev => ({
          ...prev,
          rtt: connection.rtt,
          type: connection.type,
          downlink: connection.downlink,
          saveData: connection.saveData,
          downlinkMax: connection.downlinkMax,
          effectiveType: connection.effectiveType
        }))
      }
    }

    // Initial status
    updateOnlineStatus()
    updateConnectionInfo()

    // Event listeners
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo)
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return status
}
