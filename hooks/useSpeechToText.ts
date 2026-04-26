"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSpeechToTextOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onTranscript?: (transcript: string) => void
  onError?: (error: string) => void
  onSwitchToManual?: (currentTranscript: string) => void
  maxRetries?: number
}

interface UseSpeechToTextReturn {
  isListening: boolean
  transcript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  retryCount: number
}

export function useSpeechToText({
  lang = 'tl-PH',
  continuous = false,
  interimResults = false,
  onTranscript,
  onError,
  onSwitchToManual,
  maxRetries = 2
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const recognitionRef = useRef<any>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef('')
  const retryCountRef = useRef(0)
  
  // Keep refs in sync with state
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])
  
  useEffect(() => {
    retryCountRef.current = retryCount
  }, [retryCount])

  // Check browser support on mount
  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    setIsSupported(supported)
    
    if (!supported) {
      onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
    }
  }, [onError])

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Speech recognition is not supported')
      return
    }

    // Check for network connectivity
    if (!navigator.onLine) {
      onError?.('You are offline. Speech recognition requires an internet connection.')
      return
    }

    try {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognitionAPI()
      
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = lang

      recognition.onstart = () => {
        setIsListening(true)
        setRetryCount(0) // Reset retry count on successful start
        retryCountRef.current = 0
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript)
        transcriptRef.current = fullTranscript
        onTranscript?.(fullTranscript)
      }

      recognition.onerror = (event: any) => {
        // Don't log "aborted" errors - they're expected when user stops recording
        if (event.error !== 'aborted') {
          // Use console.warn for network errors (handled gracefully), console.error for others
          if (event.error === 'network') {
            console.warn('Speech recognition network error (will retry):', event.error)
          } else {
            console.error('Speech recognition error:', event.error)
          }
        }
        const errorMessage = getErrorMessage(event.error)
        
        // Handle network errors with retry logic
        if (event.error === 'network' && retryCountRef.current < maxRetries) {
          const newRetryCount = retryCountRef.current + 1
          setRetryCount(newRetryCount)
          retryCountRef.current = newRetryCount
          setIsListening(false)
          
          onError?.(`Network error. Retrying (${newRetryCount}/${maxRetries})...`)
          
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
          }
          
          // Retry after 2 seconds
          retryTimeoutRef.current = setTimeout(() => {
            if (navigator.onLine) {
              startListening()
            } else {
              onError?.('Still offline. Please check your internet connection.')
            }
          }, 2000)
          
          return
        }
        
        // For network errors that exceeded max retries, switch to manual mode
        if (event.error === 'network' && retryCountRef.current >= maxRetries) {
          onError?.('Network error after multiple retries. Switching to manual mode.')
          onSwitchToManual?.(transcriptRef.current)
          setIsListening(false)
          return
        }
        
        // For other errors
        onError?.(errorMessage)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      onError?.('Failed to start speech recognition')
      setIsListening(false)
    }
  }, [isSupported, continuous, interimResults, lang, onTranscript, onError, onSwitchToManual, maxRetries])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    retryCount
  }
}

function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'no-speech': 'No speech detected. Please try again.',
    'audio-capture': 'Microphone not found or not allowed. Please check your microphone settings.',
    'not-allowed': 'Microphone permission denied. Please allow microphone access in your browser.',
    'network': 'Network error. Speech recognition requires an internet connection. Please check your connection and try again.',
    'aborted': 'Speech recognition was aborted.',
    'default': 'An error occurred during speech recognition. Please try again.'
  }
  
  return errorMessages[error] || errorMessages['default']
}
