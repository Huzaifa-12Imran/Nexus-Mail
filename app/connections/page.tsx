"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface Connection {
  id: string
  emailAddress: string
  provider: string
  isActive: boolean
  createdAt: string
}

export default function ConnectionsPage() {
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/connections")
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error("Error fetching connections:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      // First sync Nylas grants
      const syncResponse = await fetch("/api/nylas/sync", {
        method: "POST",
      })
      
      if (syncResponse.ok) {
        await fetchConnections()
        toast({
          title: "Sync Complete",
          description: "Your email connections have been synced.",
        })
      } else {
        throw new Error("Sync failed")
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync connections. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return
    
    try {
      const response = await fetch(`/api/connections?id=${id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        await fetchConnections()
        toast({
          title: "Connection Deleted",
          description: "The email connection has been removed.",
        })
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Unable to delete connection.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">Email Connections</h1>
        <div className="flex-1" />
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Sync Nylas Grants
            </>
          )}
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Email Connections</h2>
          <p className="text-muted-foreground mb-4">
            Add email accounts through the Nylas Dashboard to sync them here.
          </p>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync from Nylas"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className={cn(
                "flex items-center justify-between p-4 border rounded-lg",
                connection.isActive
                  ? "bg-card"
                  : "bg-muted opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  connection.provider === "google" ? "bg-red-100" : "bg-blue-100"
                )}>
                  <Mail className={cn(
                    "w-5 h-5",
                    connection.provider === "google" ? "text-red-500" : "text-blue-500"
                  )} />
                </div>
                <div>
                  <p className="font-medium">{connection.emailAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(connection.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  connection.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                )}>
                  {connection.isActive ? "Active" : "Inactive"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(connection.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
