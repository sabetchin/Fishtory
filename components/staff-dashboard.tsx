"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { LogOut, User, Save, FileText, Anchor, Scale, MapPin, Calendar, CheckCircle2, Search, ClipboardList, Pencil, Lock } from "lucide-react"
import { createFishermanAccount } from "@/app/actions/create-fisherman"

export function StaffDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; id: string } | null>(null)

  // Registration Form state (Option 1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    location: "",
    phoneNumber: "",
    vesselName: "",
    totalBoatsOperated: 1,
    totalCrew: 1,
    email: "",
    password: "",
  })

  // Catch Report state (Option 2)
  const [fishermen, setFishermen] = useState<any[]>([])
  const [selectedFishermanId, setSelectedFishermanId] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [catchSpecies, setCatchSpecies] = useState("")
  const [catchWeight, setCatchWeight] = useState("")
  const [catchDate, setCatchDate] = useState(new Date().toISOString().split('T')[0])
  
  // Additional Catch Report fields moved from Option 1
  const [leanMonths, setLeanMonths] = useState("")
  const [leanDailyAvgCatch, setLeanDailyAvgCatch] = useState("")
  const [peakMonths, setPeakMonths] = useState("")
  const [peakDailyAvgCatch, setPeakDailyAvgCatch] = useState("")
  
  const [submittingCatch, setSubmittingCatch] = useState(false)

  // My Reports (Option 3) state
  const [myReports, setMyReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [editingReport, setEditingReport] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ species: "", weight_kg: "", location: "", processing_method: "" })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const fetchUserDataAndFishermen = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      
      if (staffData) {
        setUser({ ...session.user, ...staffData })
      } else {
        setUser({ ...session.user, staff_id: 'STAFF', full_name: 'Staff Member' })
      }

      // Fetch fishermen for the dropdown
      const { data: fishermenData } = await supabase
        .from('fisherman_registration')
        .select('id, fisherman_id, first_name, last_name, boat_name, user_id, location')
        .order('first_name')
      
      if (fishermenData) {
        setFishermen(fishermenData)
      }
    }
    
    fetchUserDataAndFishermen()
  }, [])

  const fetchMyReports = async () => {
    setLoadingReports(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoadingReports(false); return }
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('submitted_by', session.user.id)
      .order('created_at', { ascending: false })
    if (!error && data) setMyReports(data)
    setLoadingReports(false)
  }

  const handleOpenEdit = (report: any) => {
    setEditingReport(report)
    setEditForm({
      species: report.species || "",
      weight_kg: String(report.weight_kg || ""),
      location: report.location || "",
      processing_method: report.processing_method || ""
    })
  }

  const handleSaveEdit = async () => {
    if (!editingReport) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('reports')
      .update({
        species: editForm.species.trim(),
        weight_kg: parseFloat(editForm.weight_kg),
        location: editForm.location.trim(),
        processing_method: editForm.processing_method.trim()
      })
      .eq('id', editingReport.id)
    if (error) {
      toast.error("Failed to update report", { description: error.message })
    } else {
      toast.success("Report updated successfully")
      setEditingReport(null)
      fetchMyReports()
    }
    setSavingEdit(false)
  }

  // Auto-fill seasonality data when a fisherman is selected
  useEffect(() => {
    if (selectedFishermanId) {
      const fetchProfileDetails = async () => {
        const { data } = await supabase
          .from('fisherman_registration')
          .select('lean_months, lean_daily_avg_catch, peak_months, peak_daily_avg_catch')
          .eq('fisherman_id', selectedFishermanId)
          .single()
        
        if (data) {
          setLeanMonths(data.lean_months || "")
          setLeanDailyAvgCatch(data.lean_daily_avg_catch?.toString() || "")
          setPeakMonths(data.peak_months || "")
          setPeakDailyAvgCatch(data.peak_daily_avg_catch?.toString() || "")
        }
      }
      fetchProfileDetails()
    } else {
      // Reset fields if unselected
      setLeanMonths("")
      setLeanDailyAvgCatch("")
      setPeakMonths("")
      setPeakDailyAvgCatch("")
    }
  }, [selectedFishermanId])

  const selectedFishermanDetails = fishermen.find(f => f.fisherman_id === selectedFishermanId)

  // Sync search filter input with the selected fisherman's name and ID
  useEffect(() => {
    if (selectedFishermanDetails) {
      setSearchFilter(`${selectedFishermanDetails.first_name} ${selectedFishermanDetails.last_name} (${selectedFishermanDetails.fisherman_id})`)
    } else {
      setSearchFilter("")
    }
  }, [selectedFishermanId, selectedFishermanDetails])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/staff/login")
  }

  // --- Option 1: Handle Profile Registration ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setCreatedCredentials(null)

    try {
      if (!formData.email) {
        throw new Error("Email address is required to create a fisherman login account.")
      }

      const res = await createFishermanAccount({
        email: formData.email,
        password: formData.password || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        boatName: formData.vesselName,
        location: formData.location,
        phoneNumber: formData.phoneNumber,
        totalBoatsOperated: formData.totalBoatsOperated,
        totalCrew: formData.totalCrew
      })

      if (!res.success) {
        throw new Error(res.error)
      }

      toast.success("Account Created Successfully", {
        description: `Fisherman profile and auth account for ${formData.firstName} have been registered.`
      })

      // Store credentials so staff can show/copy them
      setCreatedCredentials({
        email: res.email || formData.email,
        pass: res.password || "",
        id: res.fishermanId || ""
      })

      // Refresh fishermen dropdown
      const { data: newFishermenData } = await supabase
        .from('fisherman_registration')
        .select('id, fisherman_id, first_name, last_name, boat_name, user_id, location')
        .order('first_name')
      
      if (newFishermenData) setFishermen(newFishermenData)

      setFormData({
        firstName: "", lastName: "", location: "", phoneNumber: "", vesselName: "",
        totalBoatsOperated: 1, totalCrew: 1, email: "", password: ""
      })
    } catch (error: any) {
      toast.error("Failed to Create Account", { description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  // --- Option 2: Handle Catch Report ---
  const handleCatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFishermanId) {
      toast.error("Validation Error", { description: "Please select a fisherman." })
      return
    }

    setSubmittingCatch(true)
    const selectedFisherman = fishermen.find(f => f.fisherman_id === selectedFishermanId)

    try {
      // 1. Update Fisherman Profile with Seasonality data
      const { error: profileError } = await supabase
        .from('fisherman_registration')
        .update({
          lean_months: leanMonths,
          lean_daily_avg_catch: parseFloat(leanDailyAvgCatch) || 0,
          peak_months: peakMonths,
          peak_daily_avg_catch: parseFloat(peakDailyAvgCatch) || 0
        })
        .eq('fisherman_id', selectedFisherman.fisherman_id)

      if (profileError) throw profileError

      // Get current staff user id for submitted_by tracking
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const staffUserId = currentSession?.user?.id

      // 2. Insert the actual transactional catch report
      const { error } = await supabase
        .from('reports')
        .insert({
          fisherman_id: selectedFisherman.fisherman_id,
          user_id: selectedFisherman.user_id,
          submitted_by: staffUserId,
          species: catchSpecies,
          weight_kg: parseFloat(catchWeight),
          location: selectedFisherman.location || "N/A",
          status: 'pending',
          created_at: catchDate ? new Date(catchDate).toISOString() : new Date().toISOString()
        })

      if (error) throw error

      toast.success("Catch Report Submitted", {
        description: "The daily catch log has been added to the registry."
      })

      // Reset
      setSelectedFishermanId("")
      setSearchFilter("")
      setCatchSpecies("")
      setCatchWeight("")
      setCatchDate(new Date().toISOString().split('T')[0])
      setLeanMonths("")
      setLeanDailyAvgCatch("")
      setPeakMonths("")
      setPeakDailyAvgCatch("")
    } catch (error: any) {
      toast.error("Failed to Submit", { description: error.message })
    } finally {
      setSubmittingCatch(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Staff Portal</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {user?.staff_id || 'STAFF'} • {user?.full_name || 'Staff Member'}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="report" className="w-full space-y-6" onValueChange={(v) => { if (v === 'my-reports') fetchMyReports() }}>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-full md:w-max mx-auto">
            <TabsList className="grid w-full md:w-[900px] grid-cols-3">
              <TabsTrigger value="register" className="text-sm font-semibold py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                Option 1: Register Fisherman
              </TabsTrigger>
              <TabsTrigger value="report" className="text-sm font-semibold py-3 data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all">
                Option 2: Submit Daily Catch
              </TabsTrigger>
              <TabsTrigger value="my-reports" className="text-sm font-semibold py-3 data-[state=active]:bg-slate-700 data-[state=active]:text-white transition-all">
                <ClipboardList className="h-4 w-4 mr-1.5 inline-block" />
                My Submitted Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* OPTION 1: REGISTER FISHERMAN */}
          <TabsContent value="register" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-blue-100 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                <CardTitle className="text-blue-900">Fisherman Profile Registration (Form A)</CardTitle>
                <CardDescription>
                  Enter the fisherman's details below to register them in the master registry.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {createdCredentials && (
                  <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-5 mb-6 space-y-3 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-2 text-blue-800 font-bold">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Fisherman Login Account Created!
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      The account has been created. Please copy these credentials and share them with the fisherman so they can log in:
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 font-mono text-sm shadow-sm">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-semibold">Fisherman ID:</span>
                        <span className="text-blue-700 font-bold">{createdCredentials.id}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-semibold">Login Email:</span>
                        <span className="text-slate-800 font-bold select-all">{createdCredentials.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-semibold">Temporary Password:</span>
                        <span className="text-slate-800 font-bold select-all">{createdCredentials.pass}</span>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Fisherman ID: ${createdCredentials.id}\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.pass}`
                          )
                          toast.success("Copied to Clipboard", { description: "Credentials copied successfully." })
                        }}
                      >
                        Copy Credentials
                      </Button>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleRegisterSubmit} className="space-y-8">
                  {/* Operator Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Fisherman Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required placeholder="e.g., Juan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required placeholder="e.g., Dela Cruz"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location / Address *</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          required placeholder="Enter complete address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number *</Label>
                        <Input
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          required placeholder="Enter contact number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address (For Fisherman Login) *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required placeholder="juan.delacruz@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Temporary Password (Optional)</Label>
                        <Input
                          type="text"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Leave blank to auto-generate"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vessel Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Vessel Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Name of Vessel *</Label>
                        <Input
                          value={formData.vesselName}
                          onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })}
                          required placeholder="Enter vessel name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Boats Operated *</Label>
                        <Input
                          type="number" min="1"
                          value={formData.totalBoatsOperated}
                          onChange={(e) => setFormData({ ...formData, totalBoatsOperated: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total No. of Crew *</Label>
                        <Input
                          type="number" min="1"
                          value={formData.totalCrew}
                          onChange={(e) => setFormData({ ...formData, totalCrew: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={submitting} className="bg-blue-700 hover:bg-blue-800 px-8">
                      {submitting ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Register Profile</>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OPTION 2: SUBMIT CATCH REPORT */}
          <TabsContent value="report" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-green-100 shadow-md">
              <CardHeader className="bg-green-50/50 border-b border-green-100">
                <CardTitle className="text-green-900">Transactional Catch Report</CardTitle>
                <CardDescription>
                  Select an existing fisherman from the registry to log their daily catch without duplicating profile data.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCatchSubmit} className="space-y-8">
                  
                  {/* Fisherman Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
                      <User className="h-5 w-5 text-green-600" />
                      1. Select Registered Operator
                    </h3>
                    <div className="space-y-2 relative">
                      <Label>Search & Select Fisherman *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          className="w-full h-12 bg-slate-50 focus-visible:ring-green-500 pl-10 pr-10 text-sm md:text-base font-medium"
                          placeholder="Type to search fisherman name or ID..."
                          value={searchFilter}
                          onChange={(e) => {
                            setSearchFilter(e.target.value)
                            setDropdownOpen(true)
                          }}
                          onFocus={() => setDropdownOpen(true)}
                        />
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        {selectedFishermanId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 h-8 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                              setSelectedFishermanId("")
                              setSearchFilter("")
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>

                      {dropdownOpen && (
                        <>
                          {/* Transparent clickaway overlay */}
                          <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
                          
                          <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                            {(() => {
                              const filtered = fishermen.filter(f => {
                                const name = `${f.first_name} ${f.last_name}`.toLowerCase()
                                const fid = f.fisherman_id.toLowerCase()
                                const query = searchFilter.toLowerCase()
                                return name.includes(query) || fid.includes(query)
                              })
                              
                              if (filtered.length === 0) {
                                return <div className="p-4 text-sm text-slate-500 text-center">No fishermen found</div>
                              }

                              return filtered.map(f => (
                                <button
                                  key={f.fisherman_id}
                                  type="button"
                                  className="w-full text-left px-4 py-3 hover:bg-green-50/50 transition-colors text-sm text-slate-700 flex justify-between items-center border-b border-slate-100 last:border-0"
                                  onClick={() => {
                                    setSelectedFishermanId(f.fisherman_id)
                                    setDropdownOpen(false)
                                  }}
                                >
                                  <span className="font-semibold text-slate-800">{f.first_name} {f.last_name}</span>
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">{f.fisherman_id}</span>
                                </button>
                              ))
                            })()}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Autofill Display Container */}
                    {selectedFishermanDetails && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 flex flex-wrap gap-6 animate-in fade-in">
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 p-2 rounded-full mt-1">
                            <User className="h-4 w-4 text-green-700" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Operator Profile</p>
                            <p className="font-medium text-slate-800">{selectedFishermanDetails.first_name} {selectedFishermanDetails.last_name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 p-2 rounded-full mt-1">
                            <Anchor className="h-4 w-4 text-green-700" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Vessel Name</p>
                            <p className="font-medium text-slate-800">{selectedFishermanDetails.boat_name || "No vessel recorded"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 p-2 rounded-full mt-1">
                            <MapPin className="h-4 w-4 text-green-700" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Registered Location / Home Port</p>
                            <p className="font-medium text-slate-800">{selectedFishermanDetails.location || "No location recorded"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Catch Input */}
                  <div className="space-y-4 opacity-50 transition-opacity" style={{ opacity: selectedFishermanId ? 1 : 0.5 }}>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
                      <Scale className="h-5 w-5 text-green-600" />
                      2. Enter Catch Transaction
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Catch *</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            type="date"
                            className="pl-9 focus-visible:ring-green-500"
                            value={catchDate}
                            onChange={(e) => setCatchDate(e.target.value)}
                            required
                            disabled={!selectedFishermanId}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Species Caught *</Label>
                        <Input
                          className="focus-visible:ring-green-500"
                          placeholder="e.g., Tilapia"
                          value={catchSpecies}
                          onChange={(e) => setCatchSpecies(e.target.value)}
                          required
                          disabled={!selectedFishermanId}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Weight (kg) *</Label>
                        <Input
                          className="focus-visible:ring-green-500"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={catchWeight}
                          onChange={(e) => setCatchWeight(e.target.value)}
                          required
                          disabled={!selectedFishermanId}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seasonality Details (Moved from Form A) */}
                  <div className="space-y-4 opacity-50 transition-opacity" style={{ opacity: selectedFishermanId ? 1 : 0.5 }}>
                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                      3. Seasonality Details (Updates Profile)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="space-y-2">
                          <Label>Lean Months</Label>
                          <Input
                            value={leanMonths}
                            onChange={(e) => setLeanMonths(e.target.value)}
                            placeholder="e.g., January, February"
                            disabled={!selectedFishermanId}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lean Daily Average Catch (kg)</Label>
                          <Input
                            type="number" step="0.01"
                            value={leanDailyAvgCatch}
                            onChange={(e) => setLeanDailyAvgCatch(e.target.value)}
                            placeholder="e.g., 50.5"
                            disabled={!selectedFishermanId}
                          />
                        </div>
                      </div>
                      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="space-y-2">
                          <Label>Peak Months</Label>
                          <Input
                            value={peakMonths}
                            onChange={(e) => setPeakMonths(e.target.value)}
                            placeholder="e.g., June, July, August"
                            disabled={!selectedFishermanId}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Peak Daily Average Catch (kg)</Label>
                          <Input
                            type="number" step="0.01"
                            value={peakDailyAvgCatch}
                            onChange={(e) => setPeakDailyAvgCatch(e.target.value)}
                            placeholder="e.g., 150.0"
                            disabled={!selectedFishermanId}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={submittingCatch || !selectedFishermanId} 
                      className="bg-green-700 hover:bg-green-800 px-8 text-md h-12 shadow-md shadow-green-200"
                    >
                      {submittingCatch ? "Recording Transaction..." : <><CheckCircle2 className="h-5 w-5 mr-2" /> Submit Daily Catch</>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OPTION 3: MY SUBMITTED REPORTS */}
          <TabsContent value="my-reports" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-slate-600" />
                  My Submitted Reports
                </CardTitle>
                <CardDescription>
                  Reports you submitted on behalf of fishermen. Pending reports can be edited.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingReports ? (
                  <div className="text-center py-10 text-slate-500">Loading your reports...</div>
                ) : myReports.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No reports submitted yet.</p>
                    <p className="text-sm">Submit a daily catch in Option 2 to see them here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Fisherman ID</TableHead>
                          <TableHead>Species</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="whitespace-nowrap text-sm">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium text-blue-700">{report.fisherman_id || '—'}</TableCell>
                            <TableCell className="capitalize">{report.species}</TableCell>
                            <TableCell>{report.weight_kg} kg</TableCell>
                            <TableCell>{report.location}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                report.status === 'approved' ? 'bg-green-100 text-green-700' :
                                report.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  report.status === 'approved' ? 'bg-green-500' : report.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                                }`} />
                                {report.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {report.status === 'pending' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-xs border-slate-300 hover:bg-slate-50"
                                  onClick={() => handleOpenEdit(report)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                  <Lock className="h-3 w-3" /> Locked
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Report Dialog */}
        <Dialog open={!!editingReport} onOpenChange={(open) => { if (!open) setEditingReport(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-slate-600" />
                Edit Pending Report
              </DialogTitle>
              <DialogDescription>
                Only pending reports can be edited. Changes will be reviewed by admin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Species</Label>
                <Input
                  value={editForm.species}
                  onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                  placeholder="e.g. Tilapia"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.weight_kg}
                  onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g. Banicain"
                />
              </div>
              <div className="space-y-2">
                <Label>Processing Method</Label>
                <Input
                  value={editForm.processing_method}
                  onChange={(e) => setEditForm({ ...editForm, processing_method: e.target.value })}
                  placeholder="e.g. fresh, dried"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingReport(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-slate-700 hover:bg-slate-800">
                {savingEdit ? "Saving..." : <><Save className="h-4 w-4 mr-1" />Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
