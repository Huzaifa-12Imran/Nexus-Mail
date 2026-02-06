"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export default function ConnectEmailPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [connections, setConnections] = useState<Array<{
    id: string
    emailAddress: string
    provider: string
    isActive: boolean
  }>>([])
  const [oauthUrl, setOauthUrl] = useState("")
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Try getSession as fallback
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
    }

    const response = await fetch("/api/connections")
    if (response.ok) {
      const data = await response.json()
      setConnections(data.connections || [])
    }
  }

  const handleConnect = async (provider: "gmail" | "outlook" | "imap") => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    console.log("Starting OAuth flow for:", email, provider)
    try {
      const response = await fetch("/api/connections/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, provider }),
      })

      const data = await response.json()
      console.log("Create connection response:", response.status, data)

      if (response.ok && data.authUrl) {
        console.log("OAuth URL:", data.authUrl)
        setOauthUrl(data.authUrl)
        
        // Store email for callback
        localStorage.setItem("pendingConnectionEmail", email)
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.authUrl).then(() => {
          toast({
            title: "Link copied!",
            description: "Open a new tab and paste (Ctrl+V) the link",
          })
        }).catch(() => {
          toast({
            title: "Popup blocked",
            description: "Copy the link from the yellow box below",
          })
        })
        
        // Open in new tab
        const opened = window.open(data.authUrl, "_blank")
        
        if (!opened) {
          toast({
            title: "Popup blocked",
            description: "Link copied to clipboard - paste in new tab",
            variant: "destructive",
          })
        } else {
          toast({
            title: "OAuth window opened",
            description: "Complete the login in the new window",
          })
        }
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to create connection (${response.status}). Make sure you're logged in.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Connection error:", error)
      toast({
        title: "Error",
        description: "Failed to connect. Check the terminal for errors.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Email account has been disconnected",
        })
        loadConnections()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect email account",
        variant: "destructive",
      })
    }
  }

  const handleSyncNow = async (connectionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}/sync`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "✅ Emails synced successfully!",
          description: "Redirecting to inbox...",
        })
        // Redirect to home page after 1.5 seconds
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } else {
        const data = await response.json()
        toast({
          title: "Sync failed",
          description: data.error || "Failed to sync emails",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start sync",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nexus Mail - Connect Accounts</h1>
      </div>

      {/* Existing Connections */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
        {connections.length === 0 ? (
          <p className="text-muted-foreground">No email accounts connected yet.</p>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">📧</span>
                  </div>
                  <div>
                    <p className="font-medium">{connection.emailAddress}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {connection.provider}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      connection.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {connection.isActive ? "Active" : "Inactive"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncNow(connection.id)}
                    disabled={isLoading}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Account */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Connect New Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Provider
            </label>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleConnect("gmail")}
                disabled={isLoading}
                className="flex-1"
              >
                <span className="mr-2">🔵</span>
                Gmail
              </Button>
              <Button
                variant="outline"
                onClick={() => handleConnect("outlook")}
                disabled={isLoading}
                className="flex-1"
              >
                <span className="mr-2">🔷</span>
                Outlook
              </Button>
              <Button
                variant="outline"
                onClick={() => handleConnect("imap")}
                disabled={isLoading}
                className="flex-1"
              >
                <span className="mr-2">📬</span>
                IMAP
              </Button>
            </div>
          </div>
          
          {/* OAuth URL Display */}
          {oauthUrl && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2 font-bold">
                MANUAL STEPS - DO NOT CLOSE THIS PAGE:
              </p>
              <ol className="text-sm text-yellow-800 mb-2 list-decimal list-inside">
                <li>Click the COPY URL button below</li>
                <li>Open a NEW TAB (Ctrl+T)</li>
                <li>Paste (Ctrl+V) and press Enter</li>
                <li>Login with Google on Nylas</li>
              </ol>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(oauthUrl)
                  alert("URL copied! Now open a new tab and paste it.")
                }}
                className="mb-2"
              >
                📋 COPY URL
              </Button>
              <div className="p-2 bg-white border border-yellow-300 rounded text-xs break-all font-mono text-gray-600">
                {oauthUrl}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
