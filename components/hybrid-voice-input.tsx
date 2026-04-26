"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, Loader2, AlertCircle, Wifi, WifiOff, Globe, Download } from "lucide-react"
import { useSpeechToText } from "@/hooks/useSpeechToText"
import { useOfflineSpeechToText } from "@/hooks/useOfflineSpeechToText"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { parseTranscript, formatParsedData } from "@/lib/voice-parser"
import { savePendingReport } from "@/lib/offline-storage"

// Flag to track if offline STT is available
let offlineSTTAvailable = true

interface HybridVoiceInputProps {
  onTranscript: (transcript: string) => void
  onParsedData?: (data: any) => void
  user?: any
  className?: string
  language?: 'en' | 'tl' | 'fil'
}

type Mode = 'online' | 'offline'

export function HybridVoiceInput({
  onTranscript,
  onParsedData,
  user,
  className,
  language = 'tl'
}: HybridVoiceInputProps) {
  const [mode, setMode] = useState<Mode>('online')
  const [isOnline, setIsOnline] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Online speech recognition
  const onlineSpeech = useSpeechToText({
    lang: language === 'tl' ? 'tl-PH' : language === 'fil' ? 'fil-PH' : 'en-US',
    continuous: false,
    interimResults: false,
    onTranscript: (text) => {
      handleTranscript(text)
    },
    onError: (error) => {
      toast.error("Speech Recognition Error", { description: error })
    }
  })

  // Offline speech recognition
  const offlineSpeech = useOfflineSpeechToText({
    language,
    onTranscript: (text) => {
      handleTranscript(text)
    },
    onError: (error) => {
      // Only show error if it's not the initial support check
      if (!error.includes('not supported')) {
        console.error('Offline STT error:', error)
        offlineSTTAvailable = false
        toast.error("Offline Transcription Error", { 
          description: error + " Using online mode instead." 
        })
        setMode('online')
      } else {
        // Silently disable offline mode on unsupported browsers
        offlineSTTAvailable = false
      }
    },
    onProgress: (progress) => {
      console.log(`Model loading: ${progress}%`)
    }
  })

  // Audio recorder for offline mode
  const audioRecorder = useAudioRecorder({
    onRecordingComplete: async (blob) => {
      setIsProcessing(true)
      try {
        await offlineSpeech.startTranscription(blob)
      } catch (error) {
        toast.error("Transcription failed", { description: "Please try again" })
      } finally {
        setIsProcessing(false)
      }
    },
    onError: (error) => {
      toast.error("Recording Error", { description: error })
    }
  })

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-switch to offline mode when offline
  useEffect(() => {
    if (!isOnline && mode === 'online') {
      setMode('offline')
      toast.info("Offline Mode", {
        description: "Switched to offline speech recognition. Model will be downloaded."
      })
    }
  }, [isOnline, mode])

  const handleTranscript = (text: string) => {
    onTranscript(text)
    
    // Parse and update form
    const parsed = parseTranscript(text)
    onParsedData?.(parsed)
    
    toast.success("Voice Processed", {
      description: formatParsedData(parsed)
    })
  }

  const handleToggleRecording = () => {
    if (mode === 'online') {
      if (onlineSpeech.isListening) {
        onlineSpeech.stopListening()
      } else {
        onlineSpeech.startListening()
      }
    } else {
      if (audioRecorder.isRecording) {
        audioRecorder.stopRecording()
      } else {
        audioRecorder.startRecording()
      }
    }
  }

  const handleModeToggle = () => {
    if (!offlineSTTAvailable && mode === 'online') {
      toast.error("Offline Mode Unavailable", {
        description: "Offline speech recognition failed to load. Using online mode only."
      })
      return
    }
    
    const newMode = mode === 'online' ? 'offline' : 'online'
    setMode(newMode)
    
    if (newMode === 'offline' && !offlineSpeech.isModelLoaded) {
      toast.info("Loading Model", {
        description: "Downloading Whisper model for offline use. This may take a moment."
      })
    }
  }

  const getTranscript = () => {
    return mode === 'online' ? onlineSpeech.transcript : offlineSpeech.transcript
  }

  const isListening = mode === 'online' ? onlineSpeech.isListening : audioRecorder.isRecording
  const isTranscribing = mode === 'offline' ? offlineSpeech.isTranscribing : false
  const isModelLoading = mode === 'offline' ? !offlineSpeech.isModelLoaded : false

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <span className="text-slate-600">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleModeToggle}
          className="text-xs"
          disabled={!offlineSTTAvailable && mode === 'online'}
        >
          {mode === 'online' ? (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Switch to Offline
            </>
          ) : (
            <>
              <Globe className="h-3 w-3 mr-1" />
              Switch to Online
            </>
          )}
        </Button>
      </div>

      {/* Record Button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleToggleRecording}
          disabled={!isOnline && mode === 'online'}
          className={cn(
            "relative transition-all duration-300",
            isListening || isTranscribing
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isModelLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading Model...
            </>
          ) : isTranscribing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Transcribing...
            </>
          ) : isListening ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording
              {audioRecorder.recordingTime > 0 && (
                <span className="ml-2 text-xs">
                  {Math.floor(audioRecorder.recordingTime / 60)}:
                  {(audioRecorder.recordingTime % 60).toString().padStart(2, '0')}
                </span>
              )}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              {mode === 'online' ? 'Record Voice (Online)' : 'Record Voice (Offline)'}
            </>
          )}
        </Button>

        {mode === 'offline' && offlineSpeech.modelLoadingProgress > 0 && offlineSpeech.modelLoadingProgress < 100 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Download className="h-4 w-4 animate-bounce" />
            <span>{offlineSpeech.modelLoadingProgress}%</span>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {getTranscript() && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-blue-700">Transcript:</span> {getTranscript()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Offline Mode Info */}
      {mode === 'offline' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">Offline Mode Active</p>
                <p>Using local Whisper model. First use requires model download (~40MB). Reports will be saved locally and synced when connection is restored.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
