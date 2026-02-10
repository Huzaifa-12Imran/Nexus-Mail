"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckSquare, Calendar, Clock, Plus, Check, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate: string | null
  createdAt: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all")

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      })
      if (response.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        ))
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700"
      case "high": return "bg-orange-100 text-orange-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      default: return "bg-green-100 text-green-700"
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true
    return t.status === filter
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Tasks
          </h1>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button 
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button 
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found</p>
          <p className="text-sm">Extract tasks from emails to see them here!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div 
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border",
                task.status === "completed" && "bg-muted/50"
              )}
            >
              <button
                onClick={() => updateTaskStatus(
                  task.id, 
                  task.status === "completed" ? "pending" : "completed"
                )}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                  task.status === "completed" 
                    ? "bg-primary border-primary" 
                    : "border-muted-foreground"
                )}
              >
                {task.status === "completed" && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </button>
              
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded", getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
