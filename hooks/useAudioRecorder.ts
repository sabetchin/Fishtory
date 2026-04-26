"use client"

import { useState, useCallback, useRef } from 'react'

interface UseAudioRecorderOptions {
  onRecordingComplete?: (blob: Blob) => void
  onError?: (error: string) => void
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  recordingTime: number
  startRecording: () => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
  isSupported: boolean
}

export function useAudioRecorder({
  onRecordingComplete,
  onError
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isSupported, setIsSupported] = useState(true)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Check support on mount
  useState(() => {
    const supported = typeof window !== 'undefined' && 
                      'MediaRecorder' in window && 
                      'navigator' in window && 
                      'mediaDevices' in navigator
    setIsSupported(supported)
    
    if (!supported) {
      onError?.('Audio recording is not supported in this browser')
    }
  })

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.('Audio recording is not supported')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Prefer webm for better compatibility with Whisper
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg'
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        onRecordingComplete?.(blob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError?.('Microphone permission denied. Please allow microphone access.')
        } else if (error.name === 'NotFoundError') {
          onError?.('No microphone found. Please connect a microphone.')
        } else {
          onError?.('Failed to access microphone: ' + error.message)
        }
      } else {
        onError?.('Failed to access microphone')
      }
    }
  }, [isSupported, onRecordingComplete, onError])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const resetRecording = useCallback(() => {
    setRecordingTime(0)
    chunksRef.current = []
  }, [])

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
    isSupported
  }
}
