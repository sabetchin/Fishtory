"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react"
import { useSpeechToText } from "@/hooks/useSpeechToText"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface VoiceInputProps {
  onTranscript: (transcript: string) => void
  onSwitchToManual?: (transcript: string) => void
  placeholder?: string
  className?: string
  lang?: string
}

export function VoiceInput({
  onTranscript,
  onSwitchToManual,
  placeholder = "Tap the microphone and speak...",
  className,
  lang = 'tl-PH'
}: VoiceInputProps) {
  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechToText({
    lang,
    continuous: false,
    interimResults: true,
    onTranscript: (text) => {
      onTranscript(text)
    },
    onError: (error) => {
      toast.error("Speech Recognition Error", {
        description: error
      })
    },
    onSwitchToManual: (currentTranscript) => {
      onSwitchToManual?.(currentTranscript)
      toast.info("Switching to Manual Mode", {
        description: "Voice recognition failed. Please complete your report manually."
      })
    }
  })

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  if (!isSupported) {
    return (
      <Card className={cn("border-amber-200 bg-amber-50", className)}>
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            Speech recognition not supported. Please use Chrome or Edge.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleToggleListening}
          disabled={!isSupported}
          className={cn(
            "relative transition-all duration-300",
            isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Record Voice
            </>
          )}
        </Button>

        {isListening && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Listening...</span>
          </div>
        )}
      </div>

      {transcript && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-blue-700">Transcript:</span> {transcript}
            </p>
          </CardContent>
        </Card>
      )}

      {!transcript && !isListening && (
        <p className="text-sm text-slate-500">{placeholder}</p>
      )}
    </div>
  )
}
