"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export function AdminDashboard() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-7xl">
            <h1 className="text-3xl font-bold mb-8 text-blue-900">Agricultural Office Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Catch (Month)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2,350 kg</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Fishermen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">145</div>
                        <p className="text-xs text-muted-foreground">+4 new registrations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">Requires review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Species</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Bangus</div>
                        <p className="text-xs text-muted-foreground">45% of total catch</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="reports" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="reports">Incoming Reports</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="fishermen">Fishermen Registry</TabsTrigger>
                </TabsList>
                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Catch Reports</CardTitle>
                            <CardDescription>Review and approve daily catch submissions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Fisherman</TableHead>
                                        <TableHead>Species</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>R-1024</TableCell>
                                        <TableCell>Juan Delay (FM-2024-001)</TableCell>
                                        <TableCell>Tilapia</TableCell>
                                        <TableCell>35 kg</TableCell>
                                        <TableCell>Subic Bay</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                                                <Button size="sm" variant="destructive">Reject</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>R-1023</TableCell>
                                        <TableCell>Pedro Penduko (FM-2024-089)</TableCell>
                                        <TableCell>Bangus</TableCell>
                                        <TableCell>125 kg</TableCell>
                                        <TableCell>Olongapo Coast</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                                                <Button size="sm" variant="destructive">Reject</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics Overview</CardTitle>
                            <CardDescription>Detailed statistical breakdown of fisheries data.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] flex items-center justify-center bg-slate-50">
                            <p className="text-muted-foreground">Chart visualization placeholder (Recharts implementation)</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
