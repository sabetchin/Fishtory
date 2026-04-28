"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
import { Search, Plus, Edit, Trash2, Save, Loader2, X, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FishermanPrintableReport } from "./fisherman-printable-report"

// Supabase client is imported from @/lib/supabase

interface Fisherman {
  id: string
  fisherman_id: string
  last_name: string
  first_name: string
  boat_name: string
  location: string
  phone_number: string
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
  const [fishermanToPrint, setFishermanToPrint] = useState<Fisherman | null>(null)
  
  // Form State
  const [formState, setFormState] = useState({
    fisherman_id: "",
    last_name: "",
    first_name: "",
    boat_name: "",
    location: "",
    phone_number: ""
  })

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFishermen(searchQuery)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchFishermen()

    // Set up real-time subscription for fisherman profiles
    const channel = supabase
      .channel('fisherman-registry-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fishermen_profiles' },
        (payload: any) => {
          console.log('New fisherman registered:', payload)
          setFishermen((current) => [payload.new, ...current])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fishermen_profiles' },
        (payload: any) => {
          console.log('Fisherman profile updated:', payload)
          setFishermen((current) =>
            current.map((f) => (f.id === payload.new.id ? payload.new : f))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'fishermen_profiles' },
        (payload: any) => {
          console.log('Fisherman profile deleted:', payload)
          setFishermen((current) =>
            current.filter((f) => f.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchFishermen = async (query: string = "") => {
    console.log('[Fisherman Registry] Starting fetch with query:', query)
    setLoading(true)
    
    try {
      let supabaseQuery = supabase
        .from('fishermen_profiles')
        .select('*')
      
      // Server-side filtering with multi-column search using .or() and .ilike()
      if (query && query.trim() !== "") {
        const searchTerm = `%${query.trim()}%`
        console.log('[Fisherman Registry] Applying filter with term:', searchTerm)
        supabaseQuery = supabaseQuery.or(
          `last_name.ilike.${searchTerm},first_name.ilike.${searchTerm},fisherman_id.ilike.${searchTerm},boat_name.ilike.${searchTerm},location.ilike.${searchTerm}`
        )
      }
      
      console.log('[Fisherman Registry] Executing Supabase query...')
      const { data, error } = await supabaseQuery.order('created_at', { ascending: false })
      
      console.log('[Fisherman Registry] Supabase response:', {
        hasError: !!error,
        error: error?.message,
        hasData: !!data,
        dataCount: data?.length || 0,
        dataSample: data?.[0] || null
      })

      if (error) {
        console.error('[Fisherman Registry] Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setFishermen([])
      } else if (!data || data.length === 0) {
        console.warn('[Fisherman Registry] No data returned from Supabase')
        setFishermen([])
      } else {
        console.log('[Fisherman Registry] Successfully fetched', data.length, 'fishermen')
        setFishermen(data)
      }
    } catch (err) {
      console.error('[Fisherman Registry] Network or unexpected error:', err)
      setFishermen([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async () => {
    setLoading(true)
    try {
      if (editingFisherman) {
        // Update
        const { error } = await supabase
          .from('fishermen_profiles')
          .update({
            last_name: formState.last_name,
            first_name: formState.first_name,
            boat_name: formState.boat_name,
            location: formState.location,
            phone_number: formState.phone_number,
            fisherman_id: formState.fisherman_id
          })
          .eq('id', editingFisherman.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('fishermen_profiles')
          .insert([
            {
              fisherman_id: formState.fisherman_id,
              last_name: formState.last_name,
              first_name: formState.first_name,
              boat_name: formState.boat_name,
              location: formState.location,
              phone_number: formState.phone_number
            }
          ])

        if (error) throw error
      }
      
      setIsDialogOpen(false)
      setEditingFisherman(null)
      setFormState({ fisherman_id: "", last_name: "", first_name: "", boat_name: "", location: "", phone_number: "" })
      // No need to manually fetchFishermen() here as the realtime subscription will handle the UI update
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
      .from('fishermen_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      alert("Delete failed: " + error.message)
    }
    // No need to manually fetchFishermen() as the realtime subscription will handle the UI update
    setLoading(false)
  }

  const openAddDialog = () => {
    setEditingFisherman(null)
    setFormState({ fisherman_id: "", last_name: "", first_name: "", boat_name: "", location: "", phone_number: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (fisherman: Fisherman) => {
    setEditingFisherman(fisherman)
    setFormState({
      fisherman_id: fisherman.fisherman_id,
      last_name: fisherman.last_name,
      first_name: fisherman.first_name,
      boat_name: fisherman.boat_name || "",
      location: fisherman.location || "",
      phone_number: fisherman.phone_number || ""
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, ID or boat..."
            className="pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 flex gap-2">
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
                <Label htmlFor="fid" className="text-right text-xs sm:text-sm">ID</Label>
                <Input
                  id="fid"
                  placeholder="FM-2024-XXX"
                  className="col-span-3"
                  value={formState.fisherman_id}
                  onChange={(e) => setFormState({...formState, fisherman_id: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastname" className="text-right text-xs sm:text-sm">Last Name</Label>
                <Input
                  id="lastname"
                  placeholder="Last Name"
                  className="col-span-3"
                  value={formState.last_name}
                  onChange={(e) => setFormState({...formState, last_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstname" className="text-right text-xs sm:text-sm">First Name</Label>
                <Input
                  id="firstname"
                  placeholder="First Name"
                  className="col-span-3"
                  value={formState.first_name}
                  onChange={(e) => setFormState({...formState, first_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="boat" className="text-right text-xs sm:text-sm">Boat</Label>
                <Input
                  id="boat"
                  placeholder="Vessel Name"
                  className="col-span-3"
                  value={formState.boat_name}
                  onChange={(e) => setFormState({...formState, boat_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right text-xs sm:text-sm">Location</Label>
                <Input
                  id="location"
                  placeholder="Home Port"
                  className="col-span-3"
                  value={formState.location}
                  onChange={(e) => setFormState({...formState, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right text-xs sm:text-sm">Contact</Label>
                <Input
                  id="contact"
                  placeholder="Mobile Number"
                  className="col-span-3"
                  value={formState.phone_number}
                  onChange={(e) => setFormState({...formState, phone_number: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrUpdate} disabled={loading} className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingFisherman ? 'Update' : 'Register'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto w-full">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Fisherman ID</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>First Name</TableHead>
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
            ) : fishermen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                  No fishermen found.
                </TableCell>
              </TableRow>
            ) : (
              fishermen.map((f: Fisherman) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-blue-700">{f.fisherman_id}</TableCell>
                  <TableCell>{f.last_name}</TableCell>
                  <TableCell>{f.first_name}</TableCell>
                  <TableCell>{f.boat_name || "N/A"}</TableCell>
                  <TableCell>{f.location || "N/A"}</TableCell>
                  <TableCell>{f.phone_number || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setFishermanToPrint(f)}
                        className="h-8 w-8 text-slate-600 hover:text-green-600"
                        title="Download Analytics PDF"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
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
      <FishermanPrintableReport 
        fisherman={fishermanToPrint}
        onFinished={() => {
          setFishermanToPrint(null)
        }}
      />
    </div>
  )
}
