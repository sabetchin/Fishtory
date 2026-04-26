"use client"

import { Button } from "@/components/ui/button"
import { PenTool, Mic, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

type ReportMode = 'manual' | 'speech'

interface SmartModeToggleProps {
  mode: ReportMode
  onModeChange: (mode: ReportMode) => void
  isOnline: boolean
  className?: string
}

export function SmartModeToggle({ mode, onModeChange, isOnline, className }: SmartModeToggleProps) {
  const speechDisabled = !isOnline

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={mode === 'manual' ? 'default' : 'outline'}
        onClick={() => onModeChange('manual')}
        className={cn(
          "flex-1 transition-all",
          mode === 'manual' ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-slate-100"
        )}
      >
        <PenTool className="h-4 w-4 mr-2" />
        Manual
      </Button>
      
      <Button
        type="button"
        variant={mode === 'speech' ? 'default' : 'outline'}
        onClick={() => onModeChange('speech')}
        disabled={speechDisabled}
        className={cn(
          "flex-1 transition-all relative",
          mode === 'speech' ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-slate-100",
          speechDisabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className="h-4 w-4 mr-2" />
        Speech
        {speechDisabled && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            <div className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Requires internet
            </div>
          </div>
        )}
      </Button>
    </div>
  )
}
