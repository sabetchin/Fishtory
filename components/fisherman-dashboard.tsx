"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function FishermanDashboard() {
    const [activeTab, setActiveTab] = useState("new-report")

    return (
        <div className="container mx-auto py-10 px-4 max-w-6xl">
            <h1 className="text-3xl font-bold mb-8 text-blue-800">Fisherman Dashboard</h1>

            <Tabs defaultValue="new-report" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                    <TabsTrigger value="new-report">New Catch Report</TabsTrigger>
                    <TabsTrigger value="my-reports">My Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="new-report">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submit Catch Report / Mag-submit ng Ulat</CardTitle>
                            <CardDescription>
                                Fill out the details below. Takes less than 1 minute.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Fisherman ID</Label>
                                    <Input value="FM-2024-001" disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Boat Name / Pangalan ng Bangka</Label>
                                    <Input placeholder="Enter boat name" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Fish Species / Uri ng Isda</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select fish / Pumili ng isda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bangus">Bangus (Milkfish)</SelectItem>
                                        <SelectItem value="tilapia">Tilapia</SelectItem>
                                        <SelectItem value="lapu-lapu">Lapu-lapu (Grouper)</SelectItem>
                                        <SelectItem value="dilis">Dilis (Anchovies)</SelectItem>
                                        <SelectItem value="sardinas">Sardinas (Sardines)</SelectItem>
                                        <SelectItem value="tuna">Tunarya (Tuna)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Weight (kg) / Bigat</Label>
                                    <Input type="number" placeholder="0.0" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Processing / Pagproseso</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select process / Pumili ng proseso" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fresh">Fresh / Sariwa</SelectItem>
                                            <SelectItem value="smoked">Smoked / Tinapa</SelectItem>
                                            <SelectItem value="dried">Dried / Tuyo</SelectItem>
                                            <SelectItem value="salted">Salted / Daing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Location / Lokasyon</Label>
                                <Input placeholder="GPS or Landmark" />
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button className="w-full md:w-auto">Submit Report / Ipasa ang Ulat</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="my-reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report History</CardTitle>
                            <CardDescription>
                                View the status of your submitted reports.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Fish</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Feb 16, 2026</TableCell>
                                        <TableCell>Bangus</TableCell>
                                        <TableCell>50 kg</TableCell>
                                        <TableCell className="text-green-600 font-medium">Approved</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Feb 15, 2026</TableCell>
                                        <TableCell>Tilapia</TableCell>
                                        <TableCell>35 kg</TableCell>
                                        <TableCell className="text-yellow-600 font-medium">Pending</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Feb 14, 2026</TableCell>
                                        <TableCell>Tuna</TableCell>
                                        <TableCell>120 kg</TableCell>
                                        <TableCell className="text-green-600 font-medium">Approved</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
