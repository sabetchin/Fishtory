"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Search, Plus, Edit, Trash2, Save, Loader2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Fisherman {
  id: string
  fisherman_id: string
  full_name: string
  boat_name: string
  location: string
  contact_number: string
  status: string
  created_at: string
}

export function FishermanRegistry() {
  const [fishermen, setFishermen] = useState<Fisherman[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFisherman, setEditingFisherman] = useState<Fisherman | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form State
  const [formState, setFormState] = useState({
    fisherman_id: "",
    full_name: "",
    boat_name: "",
    location: "",
    contact_number: ""
  })

  useEffect(() => {
    fetchFishermen()
  }, [])

  const fetchFishermen = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fishermen')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching fishermen:", error)
    } else {
      setFishermen(data || [])
    }
    setLoading(false)
  }

  const handleCreateOrUpdate = async () => {
    setLoading(true)
    try {
      if (editingFisherman) {
        // Update
        const { error } = await supabase
          .from('fishermen')
          .update({
            full_name: formState.full_name,
            boat_name: formState.boat_name,
            location: formState.location,
            contact_number: formState.contact_number,
            fisherman_id: formState.fisherman_id
          })
          .eq('id', editingFisherman.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('fishermen')
          .insert([
            {
              fisherman_id: formState.fisherman_id,
              full_name: formState.full_name,
              boat_name: formState.boat_name,
              location: formState.location,
              contact_number: formState.contact_number
            }
          ])

        if (error) throw error
      }
      
      setIsDialogOpen(false)
      setEditingFisherman(null)
      setFormState({ fisherman_id: "", full_name: "", boat_name: "", location: "", contact_number: "" })
      fetchFishermen()
    } catch (error: any) {
      alert("Action failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fisherman?")) return
    
    setLoading(true)
    const { error } = await supabase
      .from('fishermen')
      .delete()
      .eq('id', id)

    if (error) {
      alert("Delete failed: " + error.message)
    } else {
      fetchFishermen()
    }
    setLoading(false)
  }

  const openAddDialog = () => {
    setEditingFisherman(null)
    setFormState({ fisherman_id: "", full_name: "", boat_name: "", location: "", contact_number: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (fisherman: Fisherman) => {
    setEditingFisherman(fisherman)
    setFormState({
      fisherman_id: fisherman.fisherman_id,
      full_name: fisherman.full_name,
      boat_name: fisherman.boat_name || "",
      location: fisherman.location || "",
      contact_number: fisherman.contact_number || ""
    })
    setIsDialogOpen(true)
  }

  const filteredFishermen = fishermen.filter(f => 
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.fisherman_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.boat_name && f.boat_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, ID or boat..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-blue-700 hover:bg-blue-800 flex gap-2">
              <Plus className="h-4 w-4" />
              Add Fisherman
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingFisherman ? 'Edit Fisherman' : 'Register New Fisherman'}</DialogTitle>
              <DialogDescription>
                Fill in the details below to manage the fisherman's registry information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fid" className="text-right">ID</Label>
                <Input
                  id="fid"
                  placeholder="FM-2024-XXX"
                  className="col-span-3"
                  value={formState.fisherman_id}
                  onChange={(e) => setFormState({...formState, fisherman_id: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  placeholder="Full Name"
                  className="col-span-3"
                  value={formState.full_name}
                  onChange={(e) => setFormState({...formState, full_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="boat" className="text-right">Boat</Label>
                <Input
                  id="boat"
                  placeholder="Vessel Name"
                  className="col-span-3"
                  value={formState.boat_name}
                  onChange={(e) => setFormState({...formState, boat_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Location</Label>
                <Input
                  id="location"
                  placeholder="Home Port"
                  className="col-span-3"
                  value={formState.location}
                  onChange={(e) => setFormState({...formState, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right">Contact</Label>
                <Input
                  id="contact"
                  placeholder="Mobile Number"
                  className="col-span-3"
                  value={formState.contact_number}
                  onChange={(e) => setFormState({...formState, contact_number: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrUpdate} disabled={loading} className="bg-blue-700 hover:bg-blue-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingFisherman ? 'Update Fisherman' : 'Register Fisherman'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fisherman ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Boat Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && fishermen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </TableCell>
              </TableRow>
            ) : filteredFishermen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                  No fishermen found.
                </TableCell>
              </TableRow>
            ) : (
              filteredFishermen.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-blue-700">{f.fisherman_id}</TableCell>
                  <TableCell>{f.full_name}</TableCell>
                  <TableCell>{f.boat_name || "N/A"}</TableCell>
                  <TableCell>{f.location || "N/A"}</TableCell>
                  <TableCell>{f.contact_number || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(f)}
                        className="h-8 w-8 text-slate-600 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(f.id)}
                        className="h-8 w-8 text-slate-600 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
