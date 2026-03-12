"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
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
import { User, UserCircle, Settings, Save, Loader2 } from "lucide-react"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function UserProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    fisherman_id: "",
    boat_name: "",
    role: ""
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setProfile({
          full_name: user.user_metadata.full_name || "",
          fisherman_id: user.user_metadata.fisherman_id || "",
          boat_name: user.user_metadata.boat_name || "",
          role: user.user_metadata.role || ""
        })
      }
    }
    if (isOpen) {
      getProfile()
    }
  }, [isOpen])

  const handleUpdate = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          boat_name: profile.boat_name,
          // fisherman_id and role should typically be immutable by the user, 
          // but we'll allow full_name and boat_name
        }
      })

      if (error) throw error
      alert("Profile updated successfully!")
      setIsOpen(false)
    } catch (error: any) {
      alert("Error updating profile: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-100 transition-colors">
          <UserCircle className="h-8 w-8 text-blue-900" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Profile
          </DialogTitle>
          <DialogDescription>
            View and update your account information here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={profile.full_name}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fid" className="text-right text-slate-400">
              ID
            </Label>
            <Input
              id="fid"
              value={profile.fisherman_id}
              disabled
              className="col-span-3 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          {profile.role === 'fisherman' && (
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="boat" className="text-right">
                Boat
                </Label>
                <Input
                id="boat"
                value={profile.boat_name}
                onChange={(e) => setProfile({...profile, boat_name: e.target.value})}
                className="col-span-3"
                />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right text-slate-400">
              Role
            </Label>
            <Input
              id="role"
              value={profile.role}
              disabled
              className="col-span-3 capitalize bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={loading} className="bg-blue-700 hover:bg-blue-800 flex gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
