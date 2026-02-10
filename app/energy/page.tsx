"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { EnergyRatingButtons } from "@/components/EnergyRatingModal"
import { ENERGY_CONFIG, calculateEnergyStats, analyzePatterns, EnergyRating, EnergyStats, EnergyPatterns } from "@/lib/energy-utils"

export default function EnergyDashboard() {
  const [ratings, setRatings] = useState<EnergyRating[]>([])
  const [stats, setStats] = useState<EnergyStats | null>(null)
  const [patterns, setPatterns] = useState<EnergyPatterns | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEnergyData()
  }, [period])

  const fetchEnergyData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/energy?period=${period}&suggestions=true`)
      if (!response.ok) {
        throw new Error("Failed to fetch energy data")
      }
      const data = await response.json()
      setRatings(data.ratings || [])
      setStats(data.stats)
      setPatterns(data.patterns)
      setSuggestions(data.suggestions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const energyScore = stats?.energy_score ?? 0
  const scoreColor = energyScore > 0 ? "text-green-500" : energyScore < 0 ? "text-red-500" : "text-gray-500"
  const scoreBg = energyScore > 0 ? "bg-green-100" : energyScore < 0 ? "bg-red-100" : "bg-gray-100"

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">⚡</span>
              Email Energy Budget
            </h1>
            <p className="text-muted-foreground mt-2">
              Track how emails affect your cognitive energy and optimize your schedule
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {[
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
              { value: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
              {error}
            </div>
          ) : (
            <>
              {/* Energy Score Card */}
              <div className={`${scoreBg} rounded-2xl p-6 mb-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-70">Energy Balance</p>
                    <p className={`text-6xl font-bold mt-2 ${scoreColor}`}>
                      {energyScore > 0 ? "+" : ""}{energyScore}
                    </p>
                    <p className="text-sm mt-2 opacity-70">
                      {energyScore > 0
                        ? "You're in the green! More energizing than draining emails."
                        : energyScore < 0
                        ? "Energy drain detected. Let's turn this around!"
                        : "Balanced energy. Keep tracking to see patterns."}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-4xl">
                      <span title="Drained">
                        😮‍💨
                        <span className="text-lg block text-center">{stats?.drained_count ?? 0}</span>
                      </span>
                      <span title="Neutral">
                        😐
                        <span className="text-lg block text-center">{stats?.neutral_count ?? 0}</span>
                      </span>
                      <span title="Energized">
                        ⚡
                        <span className="text-lg block text-center">{stats?.energized_count ?? 0}</span>
                      </span>
                    </div>
                    <p className="text-sm mt-4 opacity-70">
                      {stats?.total_ratings ?? 0} total ratings
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Peak Hours */}
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span>🔥</span> Peak Energy Hours
                  </h3>
                  {patterns?.peak_energy_hours && patterns.peak_energy_hours.length > 0 ? (
                    <div className="space-y-2">
                      {patterns.peak_energy_hours.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm">{h.hour}:00 - {h.hour + 1}:00</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${(h.avg_energy / 3) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">
                              {h.avg_energy.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough data yet</p>
                  )}
                </div>

                {/* Drain Hours */}
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span>🌙</span> Energy Drain Hours
                  </h3>
                  {patterns?.drain_hours && patterns.drain_hours.length > 0 ? (
                    <div className="space-y-2">
                      {patterns.drain_hours.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm">{h.hour}:00 - {h.hour + 1}:00</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${(h.avg_energy / 3) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">
                              {h.avg_energy.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough data yet</p>
                  )}
                </div>

                {/* Weekly Pattern */}
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span>📅</span> Weekly Pattern
                  </h3>
                  {patterns?.weekly_pattern && patterns.weekly_pattern.length > 0 ? (
                    <div className="flex justify-between items-end h-20 gap-1">
                      {patterns.weekly_pattern.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t ${
                              d.avg_energy >= 2.5
                                ? "bg-green-400"
                                : d.avg_energy >= 1.5
                                ? "bg-gray-400"
                                : "bg-red-300"
                            }`}
                            style={{ height: `${(d.avg_energy / 3) * 100}%`, minHeight: "4px" }}
                          />
                          <span className="text-xs">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough data yet</p>
                  )}
                </div>
              </div>

              {/* Contacts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Most Energizing Contacts */}
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span className="text-green-500">⚡</span> Energizing Contacts
                  </h3>
                  {patterns?.most_energizing_contacts && patterns.most_energizing_contacts.length > 0 ? (
                    <div className="space-y-3">
                      {patterns.most_energizing_contacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium text-green-600">#{i + 1}</span>
                            <div>
                              <p className="font-medium text-sm">{c.name || c.email}</p>
                              <p className="text-xs text-muted-foreground">{c.count} emails</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {ENERGY_CONFIG[3].icon} {c.avg_energy.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-4xl mb-2">📧</p>
                      <p className="text-sm">Rate more emails to see energizing contacts</p>
                    </div>
                  )}
                </div>

                {/* Most Draining Contacts */}
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span className="text-red-500">😮‍💨</span> Draining Contacts
                  </h3>
                  {patterns?.most_draining_contacts && patterns.most_draining_contacts.length > 0 ? (
                    <div className="space-y-3">
                      {patterns.most_draining_contacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium text-red-600">#{i + 1}</span>
                            <div>
                              <p className="font-medium text-sm">{c.name || c.email}</p>
                              <p className="text-xs text-muted-foreground">{c.count} emails</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              {ENERGY_CONFIG[1].icon} {c.avg_energy.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-4xl mb-2">📧</p>
                      <p className="text-sm">Rate more emails to see draining contacts</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <span>🤖</span> AI Scheduling Suggestions
                  </h3>
                  <div className="space-y-4">
                    {suggestions.map((s, i) => (
                      <div key={i} className="bg-background/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">💡</span>
                          <div>
                            <p className="font-medium">{s.suggested_time} - {s.suggested_day}</p>
                            <p className="text-sm text-muted-foreground mt-1">{s.reason}</p>
                            <div className="mt-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {Math.round(s.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Ratings */}
              <div className="bg-card border rounded-xl p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <span>📝</span> Recent Ratings
                </h3>
                {ratings.length > 0 ? (
                  <div className="space-y-2">
                    {ratings.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{r.energy_icon}</span>
                          <div>
                            <p className="font-medium text-sm truncate max-w-xs">
                              {r.subject || "No subject"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.sender_name || r.sender_email} • {new Date(r.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {r.time_of_day}:00
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-4xl mb-2">📊</p>
                    <p className="font-medium">No ratings yet</p>
                    <p className="text-sm mt-1">Start rating emails to see your energy patterns</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
