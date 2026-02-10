"use client"

import { useState, useEffect } from "react"
import { 
  Users, TrendingUp, TrendingDown, Minus, 
  Mail, AlertCircle, Heart, Activity, Clock, MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface Relationship {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  health_score: number
  total_emails: number
  emails_sent: number
  emails_received: number
  last_contact_at: string | null
  sentiment_trend: string
  avg_sentiment: number
  suggested_action: string | null
  recency_score: number
  response_score: number
  initiation_score: number
  sentiment_score: number
  commitment_score: number
}

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "critical">("all")
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    fetchRelationships()
  }, [])

  const fetchRelationships = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/relationships")
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
      } else {
        console.error("Failed to fetch relationships:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching relationships:", error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { icon: Heart, color: "text-green-500", label: "Healthy" }
    if (score >= 60) return { icon: Activity, color: "text-yellow-500", label: "Cooling" }
    return { icon: AlertCircle, color: "text-red-500", label: "Neglected" }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getInitiationRatio = (sent: number, received: number) => {
    const total = sent + received
    if (total === 0) return "N/A"
    const ratio = (sent / total) * 100
    return `${Math.round(ratio)}% you, ${Math.round(100 - ratio)}% them`
  }

  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  const filteredRelationships = relationships.filter(r => {
    if (filter === "all") return true
    if (filter === "healthy") return r.health_score >= 80
    if (filter === "warning") return r.health_score >= 60 && r.health_score < 80
    if (filter === "critical") return r.health_score < 60
    return true
  })

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading relationships...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Relationship Health
          </h1>
          <p className="text-muted-foreground">
            Track and improve your email relationships
          </p>
        </div>
        <Button onClick={fetchRelationships}>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">
            {relationships.filter(r => r.health_score >= 80).length}
          </div>
          <div className="text-sm text-green-700">Healthy</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">
            {relationships.filter(r => r.health_score >= 60 && r.health_score < 80).length}
          </div>
          <div className="text-sm text-yellow-700">Cooling</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600">
            {relationships.filter(r => r.health_score < 60).length}
          </div>
          <div className="text-sm text-red-700">Neglected</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600">
            {relationships.length}
          </div>
          <div className="text-sm text-blue-700">Total Contacts</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "healthy" ? "default" : "outline"}
          onClick={() => setFilter("healthy")}
          className="border-green-500 text-green-600"
        >
          Healthy
        </Button>
        <Button
          variant={filter === "warning" ? "default" : "outline"}
          onClick={() => setFilter("warning")}
          className="border-yellow-500 text-yellow-600"
        >
          Cooling
        </Button>
        <Button
          variant={filter === "critical" ? "default" : "outline"}
          onClick={() => setFilter("critical")}
          className="border-red-500 text-red-600"
        >
          Neglected
        </Button>
      </div>

      {/* Relationship List */}
      {filteredRelationships.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No relationships tracked yet.</p>
          <p className="text-sm">Start sending and receiving emails to see relationship insights.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRelationships.map((relationship) => {
            const badge = getHealthBadge(relationship.health_score)
            const BadgeIcon = badge.icon

            return (
              <div
                key={relationship.id}
                className={`border rounded-lg p-4 ${getHealthColor(relationship.health_score)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold">
                      {relationship.name ? relationship.name[0].toUpperCase() : relationship.email[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{relationship.name || relationship.email}</h3>
                        {getTrendIcon(relationship.sentiment_trend)}
                      </div>
                      <p className="text-sm text-muted-foreground">{relationship.email}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last contact: {getDaysSince(relationship.last_contact_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {relationship.total_emails} emails
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {getInitiationRatio(relationship.emails_sent, relationship.emails_received)}
                        </span>
                      </div>

                      {/* Score Breakdown */}
                      <div className="flex gap-2 mt-3">
                        <div className="text-xs px-2 py-1 bg-white/50 rounded">
                          Recency: {relationship.recency_score}/30
                        </div>
                        <div className="text-xs px-2 py-1 bg-white/50 rounded">
                          Response: {relationship.response_score}/25
                        </div>
                        <div className="text-xs px-2 py-1 bg-white/50 rounded">
                          Initiation: {relationship.initiation_score}/20
                        </div>
                        <div className="text-xs px-2 py-1 bg-white/50 rounded">
                          Sentiment: {relationship.sentiment_score}/15
                        </div>
                      </div>

                      {/* Suggested Action */}
                      {relationship.suggested_action && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>Suggested: {relationship.suggested_action}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold ${badge.color}`}>
                      {relationship.health_score}
                    </div>
                    <div className={`text-sm font-medium ${badge.color}`}>
                      {badge.label}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Back button */}
      <div className="mt-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          ← Back to Inbox
        </Button>
      </div>
    </div>
  )
}
