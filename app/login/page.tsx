"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/")
      }
    }
    checkUser()
  }, [supabase.auth, router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setPasswordError("")

    try {
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setPasswordError("Passwords do not match")
          setIsLoading(false)
          return
        }
        
        // Validate password length
        if (password.length < 6) {
          setPasswordError("Password must be at least 6 characters")
          setIsLoading(false)
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        })
        
        if (error) {
          // Check if user already exists
          if (error.message.includes("User already registered")) {
            alert("An account with this email already exists. Please sign in instead.")
            setIsSignUp(false)
          } else {
            alert(error.message)
          }
          return
        }
        
        // Show success message and switch to sign in
        alert("Registration successful! You can now sign in.")
        setIsSignUp(false)
        setPassword("")
        setConfirmPassword("")
        setName("")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            alert("Invalid email or password. Please try again.")
          } else {
            alert(error.message)
          }
          return
        }
        // Redirect to home on successful login
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          scopes: "email profile",
        },
      })
      if (error) {
        console.error("Google sign-in error:", error)
        alert(`Google sign-in failed: ${error.message}`)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      alert("An unexpected error occurred during Google sign-in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8 bg-background rounded-lg shadow-lg border border-border">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Nexus Mail</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered email client</p>
        </div>
        <h1 className="text-xl font-semibold text-center mb-6">
          {isSignUp ? "Create Account" : "Sign In"}
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="Enter your full name"
                required={isSignUp}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              placeholder="Enter your password"
              required
            />
          </div>
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                placeholder="Confirm your password"
                required={isSignUp}
              />
            </div>
          )}
          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setPasswordError("")
            }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>

        {!isSignUp && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => router.push("/forgot-password")}
            >
              Forgot your password?
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
