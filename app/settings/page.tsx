"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Mail, Bell, Shield, Palette, Loader2, Check } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [notifications, setNotifications] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("system")
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    loadProfile()
    loadSettings()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      setProfile({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at || new Date().toISOString(),
      })
      setName(user.user_metadata?.name || "")
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = () => {
    // Load notification settings
    const saved = localStorage.getItem("notifications")
    if (saved) {
      setNotifications(JSON.parse(saved))
    }
    // Load theme
    const savedTheme = localStorage.getItem("theme") || "system"
    setCurrentTheme(savedTheme)
  }

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name },
      })

      if (error) throw error

      toast({
        title: "Settings saved",
        description: "Your name has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleNotifications = async () => {
    if (!notifications) {
      if (!("Notification" in window)) {
        toast({
          title: "Not supported",
          description: "This browser does not support notifications.",
          variant: "destructive",
        })
        return
      }
      
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        })
        return
      }
    }
    
    setNotifications(!notifications)
    localStorage.setItem("notifications", JSON.stringify(!notifications))
    
    toast({
      title: "Settings saved",
      description: !notifications ? "Notifications enabled." : "Notifications disabled.",
    })
  }

  const handleChangeTheme = (themeValue: string) => {
    setCurrentTheme(themeValue)
    setTheme(themeValue)
    localStorage.setItem("theme", themeValue)
    toast({
      title: "Theme updated",
      description: `Switched to ${themeValue} theme.`,
    })
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
      setShowPasswordForm(false)
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = () => {
    toast({
      title: "Two-Factor Authentication",
      description: "This feature requires a Supabase Pro plan. Please upgrade your project to enable 2FA.",
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <Button onClick={handleSaveName} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Member Since</label>
              <p className="text-muted-foreground">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Desktop Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Show desktop alerts for new emails
                </p>
              </div>
              <Button 
                variant={notifications ? "default" : "outline"} 
                onClick={toggleNotifications}
              >
                {notifications && <Check className="h-4 w-4 mr-2" />}
                {notifications ? "Enabled" : "Enable"}
              </Button>
            </div>

            {notifications && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-700">Desktop notifications are active</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connected Accounts Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connected Email Accounts</h2>
          </div>

          <p className="text-muted-foreground mb-4">
            Manage your connected email accounts in the{" "}
            <Link href="/connections" className="text-primary hover:underline">
              Connections
            </Link>{" "}
            page.
          </p>

          <Link href="/connections">
            <Button variant="outline">
              Manage Connections
            </Button>
          </Link>
        </div>

        {/* Appearance Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">Theme</p>
              <p className="text-sm text-muted-foreground mb-3">
                Choose your preferred theme
              </p>
              <div className="flex gap-2">
                <Button 
                  variant={currentTheme === "light" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleChangeTheme("light")}
                >
                  Light
                </Button>
                <Button 
                  variant={currentTheme === "dark" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleChangeTheme("dark")}
                >
                  Dark
                </Button>
                <Button 
                  variant={currentTheme === "system" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleChangeTheme("system")}
                >
                  System
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>

          <div className="space-y-4">
            {/* Change Password */}
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground mb-3">
                Update your password for better security
              </p>
              
              {!showPasswordForm ? (
                <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                  Change Password
                </Button>
              ) : (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Password"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword("")
                        setConfirmPassword("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Two-Factor Authentication */}
            <div className="pt-4 border-t">
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground mb-3">
                Add an extra layer of security
              </p>
              <Button variant="outline" onClick={handleEnable2FA}>
                Enable
              </Button>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-muted-foreground mb-4">
            Once you log out, you will need to sign in again to access your account.
          </p>
          <Button variant="destructive" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
