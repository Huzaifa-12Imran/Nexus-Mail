export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface Email {
  id: string
  userId: string
  connectionId: string
  messageId: string
  threadId?: string
  from: string
  fromEmail: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  bodyHtml?: string
  snippet?: string
  summary?: string
  categoryId?: string
  importance: number
  sentiment?: 'positive' | 'negative' | 'neutral'
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean
  isSent: boolean
  isDraft: boolean
  vectorId?: string
  receivedAt: Date
  sentAt?: Date
  createdAt: Date
  updatedAt: Date
  category?: Category
  labels?: EmailLabel[]
}

export interface Category {
  id: string
  userId: string
  name: string
  color?: string
  isDefault: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface EmailLabel {
  id: string
  emailId: string
  name: string
  color?: string
  createdAt: Date
}

export interface EmailConnection {
  id: string
  userId: string
  emailAddress: string
  provider: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Draft {
  id: string
  userId: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  attachments?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface UserSession {
  id: string
  userId: string
  sessionToken: string
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope?: string[]
  ipAddress?: string
  userAgent?: string
  lastAccessedAt: Date
  createdAt: Date
  revokedAt?: Date
}

// ============================================================================
// CALENDAR/EVENT TYPES
// ============================================================================

export interface Event {
  id: string
  userId: string
  externalId?: string
  accountId?: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  isAllDay: boolean
  timezone?: string
  recurrence?: EventRecurrence
  recurrenceEnd?: Date
  status: 'confirmed' | 'tentative' | 'cancelled'
  availability: 'free' | 'busy' | 'tentative' | 'out-of-office'
  reminders?: EventReminder[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  attendees?: EventAttendee[]
}

export interface EventRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  until?: Date
  count?: number
  daysOfWeek?: number[]
}

export interface EventReminder {
  minutesBefore: number
  method: 'email' | 'popup'
}

export interface EventAttendee {
  id: string
  eventId: string
  email: string
  name?: string
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
  isOrganizer: boolean
  createdAt: Date
}

// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface Contact {
  id: string
  userId: string
  externalId?: string
  accountId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  mobile?: string
  company?: string
  title?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressPostal?: string
  addressCountry?: string
  notes?: string
  website?: string
  linkedIn?: string
  groups?: string[]
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface Task {
  id: string
  userId: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  completedAt?: Date
  relatedEmailId?: string
  relatedEventId?: string
  relatedContactId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// ============================================================================
// NOTE TYPES
// ============================================================================

export interface Note {
  id: string
  userId: string
  title: string
  content: string
  relatedEmailId?: string
  relatedContactId?: string
  relatedEventId?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// ============================================================================
// EMAIL SNOOZE TYPES
// ============================================================================

export interface SnoozedEmail {
  id: string
  userId: string
  emailId: string
  snoozeUntil: Date
  folder: 'inbox' | 'primary' | 'social' | 'promotions'
  createdAt: Date
  updatedAt: Date
}

export type SnoozeOption = 
  | { type: 'today'; time: string }
  | { type: 'tomorrow'; time: string }
  | { type: 'nextWeek'; dayOfWeek: number }
  | { type: 'custom'; date: string; time: string }

// ============================================================================
// EMAIL REMINDER TYPES
// ============================================================================

export interface EmailReminder {
  id: string
  userId: string
  emailId?: string
  title: string
  message?: string
  remindAt: Date
  isCompleted: boolean
  completedAt?: Date
  notified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateReminderRequest {
  emailId?: string
  title: string
  message?: string
  remindAt: string
}

// ============================================================================
// PRIORITY SENDER TYPES
// ============================================================================

export interface PrioritySender {
  id: string
  userId: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePrioritySenderRequest {
  email: string
  name?: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface SendEmailRequest {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  bodyHtml?: string
  threadId?: string
}

export interface EmailSearchResult {
  id: string
  score: number
  email: Email
}

export interface CreateEventRequest {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay?: boolean
  recurrence?: EventRecurrence
  attendees?: string[]
  reminders?: EventReminder[]
}

export interface CreateContactRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  mobile?: string
  company?: string
  title?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  notes?: string
  groups?: string[]
}

export interface SnoozeEmailRequest {
  snoozeUntil: string
  folder?: 'inbox' | 'primary' | 'social' | 'promotions'
}
