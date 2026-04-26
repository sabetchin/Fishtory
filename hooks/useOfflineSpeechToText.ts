"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

// Dynamic import for @xenova/transformers to avoid module resolution issues
let transformers: any = null
let pipeline: any = null
let env: any = null

async function loadTransformers() {
  if (transformers) return transformers
  
  try {
    transformers = await import('@xenova/transformers')
    pipeline = transformers.pipeline
    env = transformers.env
    
    // Configure transformers.js to use local models
    env.allowLocalModels = false
    env.useBrowserCache = true
    
    return transformers
  } catch (error) {
    console.error('Failed to load @xenova/transformers:', error)
    throw error
  }
}

interface UseOfflineSpeechToTextOptions {
  language?: 'en' | 'tl' | 'fil'
  onTranscript?: (transcript: string) => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
}

interface UseOfflineSpeechToTextReturn {
  isTranscribing: boolean
  transcript: string
  isModelLoaded: boolean
  modelLoadingProgress: number
  startTranscription: (audioBlob: Blob) => Promise<void>
  resetTranscript: () => void
  isSupported: boolean
}

export function useOfflineSpeechToText({
  language = 'en',
  onTranscript,
  onError,
  onProgress
}: UseOfflineSpeechToTextOptions = {}): UseOfflineSpeechToTextReturn {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [isSupported, setIsSupported] = useState(true)
  
  const transcriberRef = useRef<any>(null)
  const modelLoadPromiseRef = useRef<Promise<any> | null>(null)

  // Check Web Audio API support
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
                      ('AudioContext' in window || 'webkitAudioContext' in window)
    setIsSupported(supported)
    
    if (!supported) {
      onError?.('Web Audio API is not supported in this browser')
    }
  }, [onError])

  // Load Whisper model
  const loadModel = useCallback(async () => {
    if (modelLoadPromiseRef.current) {
      return modelLoadPromiseRef.current
    }

    if (transcriberRef.current) {
      return transcriberRef.current
    }

    const loadPromise = (async () => {
      try {
        setModelLoadingProgress(0)
        
        // Load transformers dynamically
        await loadTransformers()
        
        if (!pipeline) {
          throw new Error('Failed to load transformers pipeline')
        }
        
        // Use Xenova's Whisper Tiny model for faster loading
        // Language-specific models: 'Xenova/whisper-tiny' supports multiple languages
        const transcriber = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny',
          {
            progress_callback: (progress: any) => {
              if (progress.status === 'progress') {
                const percentage = progress.progress ? Math.round(progress.progress * 100) : 0
                setModelLoadingProgress(percentage)
                onProgress?.(percentage)
              }
            }
          }
        )
        
        transcriberRef.current = transcriber
        setIsModelLoaded(true)
        setModelLoadingProgress(100)
        
        return transcriber
      } catch (error) {
        console.error('Failed to load Whisper model:', error)
        onError?.('Failed to load speech recognition model. Please refresh the page.')
        setIsModelLoaded(false)
        throw error
      }
    })()

    modelLoadPromiseRef.current = loadPromise
    return loadPromise
  }, [onError, onProgress])

  // Preload model on mount
  useEffect(() => {
    if (isSupported) {
      loadModel()
    }
  }, [isSupported, loadModel])

  const startTranscription = useCallback(async (audioBlob: Blob) => {
    if (!isSupported) {
      onError?.('Speech recognition is not supported')
      return
    }

    if (!audioBlob) {
      onError?.('No audio provided')
      return
    }

    setIsTranscribing(true)
    setTranscript('')

    try {
      // Ensure model is loaded
      const transcriber = await loadModel()
      
      // Convert audio blob to the format expected by the model
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Get audio data as Float32Array
      const audioData = audioBuffer.getChannelData(0)
      
      // Transcribe with language parameter
      const result = await transcriber(audioData, {
        language: language === 'tl' ? 'tagalog' : language === 'fil' ? 'filipino' : 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      })
      
      const text = result?.text || ''
      setTranscript(text)
      onTranscript?.(text)
      
    } catch (error) {
      console.error('Transcription error:', error)
      onError?.('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }, [isSupported, language, loadModel, onTranscript, onError])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isTranscribing,
    transcript,
    isModelLoaded,
    modelLoadingProgress,
    startTranscription,
    resetTranscript,
    isSupported
  }
}
