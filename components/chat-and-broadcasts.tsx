"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Megaphone, User, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface UserInfo {
    id: string
    name: string
    role: string
}

export function ChatAndBroadcasts({ currentUser, role }: { currentUser: UserInfo, role: 'admin' | 'fisherman' }) {
    const [messages, setMessages] = useState<any[]>([])
    const [broadcasts, setBroadcasts] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [newBroadcast, setNewBroadcast] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Fetch initial data
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)
            if (data) setMessages(data.reverse())
        }

        const fetchBroadcasts = async () => {
            const { data } = await supabase
                .from('broadcasts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)
            if (data) setBroadcasts(data)
        }

        fetchMessages()
        fetchBroadcasts()

        const msgChannel = supabase
            .channel('messages-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                setMessages((current) => [...current, payload.new])
            })
            .subscribe()

        const broadcastChannel = supabase
            .channel('broadcasts-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload: any) => {
                setBroadcasts((current) => [payload.new, ...current])
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'broadcasts' }, (payload: any) => {
                setBroadcasts((current) => current.filter(b => b.id !== payload.old.id))
            })
            .subscribe()

        return () => {
            supabase.removeChannel(msgChannel)
            supabase.removeChannel(broadcastChannel)
        }
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const { error } = await supabase.from('messages').insert([{
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_role: role,
            content: newMessage.trim()
        }])

        if (!error) {
            setNewMessage("")
        } else {
            toast.error("Failed to send message: " + error.message)
        }
    }

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBroadcast.trim() || role !== 'admin') return

        setLoading(true)
        const { error } = await supabase.from('broadcasts').insert([{
            content: newBroadcast.trim()
        }])

        setLoading(false)
        if (!error) {
            setNewBroadcast("")
            toast.success("Broadcast posted successfully!")
        } else {
            toast.error("Failed to post broadcast: " + error.message)
        }
    }

    const deleteBroadcast = async (id: string) => {
        const { error } = await supabase.from('broadcasts').delete().eq('id', id)
        if (!error) {
            toast.success("Broadcast removed.")
        }
    }

    const formatTime = (ts: string) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex flex-col xl:flex-row gap-6 w-full h-full max-h-[800px]">
            {/* Announcements Panel */}
            <div className="w-full xl:w-1/3 flex flex-col space-y-4">
                <Card className="flex-1 flex flex-col shadow-sm border-slate-200">
                    <CardHeader className="bg-amber-50/50 pb-4 border-b border-amber-100">
                        <CardTitle className="flex items-center text-amber-900 text-lg">
                            <Megaphone className="w-5 h-5 mr-2 text-amber-600" />
                            Official Announcements
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 bg-slate-50/30">
                        {role === 'admin' && (
                            <form onSubmit={sendBroadcast} className="mb-6 space-y-2">
                                <Input 
                                    placeholder="Write a new broadcast..."
                                    value={newBroadcast}
                                    onChange={(e) => setNewBroadcast(e.target.value)}
                                    className="bg-white border-slate-200"
                                />
                                <Button type="submit" disabled={loading} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                    Publish Announcement
                                </Button>
                            </form>
                        )}
                        <div className="h-[300px] xl:h-[500px] overflow-y-auto pr-2">
                            {broadcasts.length === 0 ? (
                                <div className="text-center text-slate-400 py-10 italic text-sm">
                                    No announcements yet.
                                </div>
                            ) : (
                                <div className="space-y-3 mt-2 pr-2">
                                    {broadcasts.map((b) => (
                                        <div key={b.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(b.created_at).toLocaleDateString()}
                                                </span>
                                                {role === 'admin' && (
                                                    <button onClick={() => deleteBroadcast(b.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-700 text-sm font-medium leading-relaxed">{b.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chat Panel */}
            <div className="w-full xl:w-2/3 flex flex-col h-[500px] xl:h-auto">
                <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
                        <CardTitle className="flex items-center text-blue-900 text-lg">
                            <User className="w-5 h-5 mr-2 text-blue-600" />
                            Community Chat
                        </CardTitle>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 h-[300px]" ref={scrollRef}>
                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 mt-20 italic">
                                Start the conversation!
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === currentUser.id
                                const isAdmin = msg.sender_role === 'admin'
                                return (
                                    <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-3 flex flex-col",
                                            isMe ? "bg-blue-600 text-white shadow-md shadow-blue-200" : 
                                            isAdmin ? "bg-amber-100 text-amber-900 border border-amber-200" :
                                            "bg-white border border-slate-200 text-slate-800 shadow-sm"
                                        )}>
                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                <span className={cn(
                                                    "text-xs font-bold whitespace-nowrap",
                                                    isMe ? "text-blue-100" : isAdmin ? "text-amber-700" : "text-slate-500"
                                                )}>
                                                    {msg.sender_name} {isAdmin && !isMe && "(Admin)"}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] opacity-70",
                                                    isMe ? "text-blue-200" : "text-slate-400"
                                                )}>
                                                    {formatTime(msg.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100">
                        <form onSubmit={sendMessage} className="flex items-center gap-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 h-11"
                            />
                            <Button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 shadow-sm">
                                <Send className="w-4 h-4 ml-1" />
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    )
}
