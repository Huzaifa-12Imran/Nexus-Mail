"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Event {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay: boolean
  attendees: { email: string; status: string }[]
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events?upcoming=true")
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getEventsForDay = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const targetDate = new Date(year, month, day)
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === targetDate.toDateString()
    })
  }

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.startTime).toDateString()
    const nowDate = new Date().toDateString()
    return eventDate === nowDate
  }).slice(0, 5)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendar
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 min-h-[100px] border bg-muted/30" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(day)
                return (
                  <div key={day} className="p-2 min-h-[100px] border">
                    <span className={cn(
                      "text-sm",
                      day === new Date().getDate() && 
                      currentDate.getMonth() === new Date().getMonth() &&
                      "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                    )}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div 
                          key={event.id}
                          className="text-xs p-1 bg-primary/10 text-primary rounded truncate"
                          title={event.title}
                        >
                          {formatTime(event.startTime)} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming events</p>
              <p className="text-sm">Add events from emails to see them here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 10).map(event => (
                <div key={event.id} className="p-3 border rounded-lg">
                  <h3 className="font-medium">{event.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(event.startTime)} at {formatTime(event.startTime)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Users className="h-3 w-3" />
                      {event.attendees.length} attendee(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
