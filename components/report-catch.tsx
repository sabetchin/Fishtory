"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, MicOff, Loader2, CheckCircle2, Wifi, WifiOff } from "lucide-react"
import { useSpeechToText } from "@/hooks/useSpeechToText"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { SmartModeToggle } from "@/components/smart-mode-toggle"
import { parseTranscript, formatParsedData } from "@/lib/voice-parser"
import { savePendingReport, getPendingReportsCount } from "@/lib/offline-storage"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ReportMode = 'manual' | 'speech'

interface ReportCatchProps {
  user?: any
  onSubmit?: () => void
}

export function ReportCatch({ user, onSubmit }: ReportCatchProps) {
  const networkStatus = useNetworkStatus()
  const [mode, setMode] = useState<ReportMode>('manual')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  
  // Form state
  const [species, setSpecies] = useState("")
  const [weight, setWeight] = useState("")
  const [location, setLocation] = useState("")

  // Voice recognition
  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechToText({
    lang: 'tl-PH',
    continuous: false,
    interimResults: false,
    onTranscript: (text) => {
      handleVoiceTranscript(text)
    },
    onError: (error) => {
      toast.error("Speech Recognition Error", { description: error })
    }
  })

  // Auto-sync pending reports when online
  useEffect(() => {
    if (networkStatus.isOnline) {
      syncPendingReports()
    }
  }, [networkStatus.isOnline])

  // Update pending count
  useEffect(() => {
    updatePendingCount()
  }, [])

  // Lock to manual mode when offline
  useEffect(() => {
    if (!networkStatus.isOnline && mode === 'speech') {
      setMode('manual')
      toast.info("Offline Mode", {
        description: "Speech-to-Text requires internet. Switched to Manual mode."
      })
    }
  }, [networkStatus.isOnline, mode])

  const updatePendingCount = async () => {
    const count = await getPendingReportsCount()
    setPendingCount(count)
  }

  const handleVoiceTranscript = (text: string) => {
    // Parse the transcript and auto-fill form
    const parsed = parseTranscript(text)
    
    if (parsed.species) setSpecies(parsed.species)
    if (parsed.weight) setWeight(parsed.weight)
    if (parsed.location) setLocation(parsed.location)
    
    toast.success("Voice Processed", {
      description: formatParsedData(parsed)
    })
    
    // Switch to manual mode to review and edit
    setMode('manual')
  }

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  const handleSubmit = async () => {
    if (!user) return toast.error("Authentication required", {
      description: "You must be logged in to submit a report."
    })
    
    if (!species || !weight || !location) {
      return toast.error("Missing Information", {
        description: "Please fill in all required fields."
      })
    }

    setIsSubmitting(true)

    const fishermanId = user.user_metadata?.fisherman_id || 'Unknown'
    const boatName = user.user_metadata?.boat_name || 'Unknown'

    if (networkStatus.isOnline) {
      // Submit directly to Supabase
      const { error } = await supabase
        .from('reports')
        .insert([
          {
            fisherman_id: fishermanId,
            user_id: user.id,
            boat_name: boatName,
            species,
            weight_kg: Number(weight),
            location,
            status: 'pending'
          }
        ])

      if (error) {
        toast.error("Submission Failed", { description: error.message })
      } else {
        toast.success("Report Submitted", {
          description: "Your catch report has been sent successfully!"
        })
        resetForm()
        onSubmit?.()
      }
    } else {
      // Offline: Save to IndexedDB
      try {
        await savePendingReport({
          fisherman_id: fishermanId,
          user_id: user.id,
          boat_name: boatName,
          species,
          weight_kg: Number(weight),
          processing_method: 'fresh',
          location,
          transcript: transcript || undefined
        })
        
        toast.success("Report Saved Offline", {
          description: "Your report will be synced when connection is restored."
        })
        resetForm()
        updatePendingCount()
      } catch (error) {
        toast.error("Save Failed", {
          description: "Could not save report offline. Please try again."
        })
      }
    }

    setIsSubmitting(false)
  }

  const syncPendingReports = async () => {
    const reports = await getPendingReportsCount()
    if (reports > 0) {
      toast.info("Syncing Reports", {
        description: `${reports} pending reports will be synced automatically.`
      })
    }
  }

  const resetForm = () => {
    setSpecies("")
    setWeight("")
    setLocation("")
    resetTranscript()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Report Catch</CardTitle>
            <CardDescription>Submit your catch quickly and easily</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {networkStatus.isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-red-600">Offline</span>
              </>
            )}
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Smart Mode Toggle */}
        <SmartModeToggle
          mode={mode}
          onModeChange={setMode}
          isOnline={networkStatus.isOnline}
        />

        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label htmlFor="species">Species *</Label>
              <Select value={species} onValueChange={setSpecies}>
                <SelectTrigger id="species">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bangus">Bangus (Milkfish)</SelectItem>
                  <SelectItem value="tilapia">Tilapia</SelectItem>
                  <SelectItem value="lapu-lapu">Lapu-lapu (Grouper)</SelectItem>
                  <SelectItem value="dilis">Dilis (Anchovies)</SelectItem>
                  <SelectItem value="sardinas">Sardinas (Sardines)</SelectItem>
                  <SelectItem value="tuna">Tuna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 5.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banicain">Banicain</SelectItem>
                  <SelectItem value="barretto">Barretto</SelectItem>
                  <SelectItem value="kalaklan">Kalaklan</SelectItem>
                  <SelectItem value="olongapo">Olongapo City</SelectItem>
                  <SelectItem value="subic">Subic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Speech Mode */}
        {mode === 'speech' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                {isListening ? (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                    <MicOff className="h-12 w-12 text-white relative z-10" />
                  </div>
                ) : (
                  <Mic className="h-12 w-12 text-white" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isListening ? "Listening..." : "Tap to Record"}
                </h3>
                <p className="text-sm text-slate-600">
                  {isListening 
                    ? "Speak clearly. Say: 'I caught 5kg of bangus in Barretto'"
                    : "Describe your catch in Tagalog or English. We'll auto-fill the form."
                  }
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleToggleRecording}
                disabled={!isSupported}
                className={cn(
                  "w-full max-w-xs transition-all",
                  isListening ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
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
                    Start Recording
                  </>
                )}
              </Button>

              {transcript && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium">
                    "{transcript}"
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ Form auto-filled. Review in Manual tab.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-medium text-sm mb-2">Example phrases:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• "Nakakuha ako ng limang kilong bangus sa Barretto"</li>
                <li>• "I caught 10kg of tilapia in Banicain"</li>
                <li>• "May sampung kilong tuna ako sa Kalaklan"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-6 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {networkStatus.isOnline ? "Submitting..." : "Saving Offline..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {networkStatus.isOnline ? "Submit Report" : "Save Offline"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
