"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCircle, Save, Loader2, CheckCircle2 } from "lucide-react"

export function UserProfile() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Read-only fields
  const [fishermanId, setFishermanId] = useState("")
  const [role, setRole] = useState("")

  // Editable — including email
  const [email, setEmail] = useState("")

  // Editable fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [boatName, setBoatName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setSaved(false)

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setEmail(user.email || "")
      setFishermanId(user.user_metadata?.fisherman_id || "")
      setRole(user.user_metadata?.role || "")
      setFirstName(user.user_metadata?.first_name || "")
      setLastName(user.user_metadata?.last_name || "")
      setBoatName(user.user_metadata?.boat_name || "")
      setContactNumber(user.user_metadata?.phone_number || "")
      setLocation(user.user_metadata?.location || "")

      // If metadata is incomplete, try to hydrate from fishermen_profiles table
      if (!user.user_metadata?.boat_name && user.user_metadata?.fisherman_id) {
        const { data: profileRow } = await supabase
          .from("fishermen_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (profileRow) {
          setFirstName(profileRow.first_name || "")
          setLastName(profileRow.last_name || "")
          setBoatName(profileRow.boat_name || "")
          setContactNumber(profileRow.phone_number || "")
          setLocation(profileRow.location || "")
        }
      }
    }

    loadProfile()
  }, [isOpen])

  const handleUpdate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("First name and last name are required.")
      return
    }

    setLoading(true)
    setSaved(false)

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`

      // 1. Update Supabase auth user metadata + email
      const { error: authError } = await supabase.auth.updateUser({
        email: email.trim() || undefined,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          boat_name: boatName.trim(),
          phone_number: contactNumber.trim(),
          location,
        }
      })

      if (authError) throw authError

      // 2. Also update the fishermen_profiles row (if it exists)
      if (userId && fishermanId) {
        const { error: dbError } = await supabase
          .from("fishermen_profiles")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            boat_name: boatName.trim(),
            phone_number: contactNumber.trim(),
            location,
          })
          .eq("user_id", userId)

        if (dbError) {
          console.warn("fishermen_profiles update warning:", dbError.message)
          // Non-fatal: metadata is already updated
        }
      }

      setSaved(true)
      // Auto-close after a moment
      setTimeout(() => setIsOpen(false), 1200)
    } catch (err: any) {
      console.error("Profile update error:", err)
      alert("Error updating profile: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-blue-100 transition-colors"
          title="Edit Profile"
        >
          <UserCircle className="h-8 w-8 text-blue-900" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-900">
            <UserCircle className="h-5 w-5 text-blue-600" />
            My Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information below and click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Read-only: Fisherman ID */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Fisherman ID
            </Label>
            <Input
              value={fishermanId || "—"}
              disabled
              className="bg-slate-50 text-slate-500 cursor-not-allowed font-mono tracking-wider"
            />
          </div>

          {/* Editable: Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400">Changing your email will require re-verification.</p>
          </div>

          <hr className="border-slate-100" />

          {/* Editable: First + Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="dela Cruz"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Editable: Boat Name (fisherman only) */}
          {(role === "fisherman" || !role) && (
            <div className="space-y-1">
              <Label htmlFor="boatName" className="text-sm font-medium">
                Boat Name
              </Label>
              <Input
                id="boatName"
                placeholder="e.g., Bulalacao II"
                value={boatName}
                onChange={(e) => setBoatName(e.target.value)}
              />
            </div>
          )}

          {/* Editable: Contact Number */}
          <div className="space-y-1">
            <Label htmlFor="contact" className="text-sm font-medium">
              Contact Number
            </Label>
            <Input
              id="contact"
              type="tel"
              placeholder="09XX-XXX-XXXX"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>

          {/* Editable: Location (fisherman only) */}
          {(role === "fisherman" || !role) && (
            <div className="space-y-1">
              <Label htmlFor="location" className="text-sm font-medium">
                Barangay / Location
              </Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select barangay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banicain">Banicain</SelectItem>
                  <SelectItem value="Barretto">Barretto</SelectItem>
                  <SelectItem value="Kalaklan">Kalaklan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpdate}
            disabled={loading || saved}
            className={`flex items-center gap-2 transition-colors ${
              saved
                ? "bg-green-600 hover:bg-green-600"
                : "bg-blue-700 hover:bg-blue-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
