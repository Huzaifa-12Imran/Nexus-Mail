const AURINKO_API_URL = process.env.AURINKO_API_URL || 'https://api.aurinko.io'
const AURINKO_CLIENT_ID = process.env.AURINKO_CLIENT_ID!
const AURINKO_CLIENT_SECRET = process.env.AURINKO_CLIENT_SECRET!

// ============================================================================
// EMAIL TYPES
// ============================================================================

interface AurinkoEmail {
  messageId: string
  threadId?: string
  from: {
    email: string
    name?: string
  }
  to: Array<{ email: string; name?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject: string
  body: string
  bodyHtml?: string
  snippet?: string
  receivedAt: string
  sentAt?: string
  isRead: boolean
  isSent: boolean
}

interface SendEmailRequest {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  bodyHtml?: string
  threadId?: string
}

// ============================================================================
// CALENDAR/EVENT TYPES (Scheduler)
// ============================================================================

interface AurinkoEvent {
  id: string
  accountId: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay: boolean
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    until?: string
    count?: number
  }
  attendees: Array<{
    email: string
    name?: string
    status: 'pending' | 'accepted' | 'declined' | 'tentative'
  }>
  reminders?: Array<{
    minutesBefore: number
    method: 'email' | 'popup'
  }>
}

interface CreateEventRequest {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  isAllDay?: boolean
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    until?: string
    count?: number
  }
  attendees?: string[]
  reminders?: Array<{
    minutesBefore: number
    method: 'email' | 'popup'
  }>
}

// ============================================================================
// CONTACT/CRM TYPES
// ============================================================================

interface AurinkoContact {
  id: string
  accountId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
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
  createdAt: string
  updatedAt: string
}

interface CreateContactRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
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

// ============================================================================
// MAILBOX/SESSION TYPES (End User Sessions)
// ============================================================================

interface AurinkoAccount {
  id: string
  email: string
  name?: string
  provider: 'gmail' | 'outlook' | 'imap'
  scope: string[]
  status: 'active' | 'pending' | 'error'
  error?: string
  createdAt: string
  updatedAt: string
  syncStatus: {
    lastSyncAt?: string
    emailsSynced: number
    contactsSynced: number
    eventsSynced: number
    status: 'syncing' | 'completed' | 'error'
  }
}

interface MailboxSession {
  id: string
  accountId: string
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string[]
  createdAt: string
  lastAccessedAt: string
}

interface CreateSessionRequest {
  accountId: string
  userId: string
  scope?: string[]
}

// ============================================================================
// AURINKO CLIENT
// ============================================================================

class AurinkoClient {
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${AURINKO_CLIENT_ID}:${AURINKO_CLIENT_SECRET}`).toString('base64')}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${AURINKO_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Aurinko API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // =========================================================================
  // EMAIL OPERATIONS
  // =========================================================================

  async getEmails(accountId: string, limit: number = 50, offset: number = 0): Promise<AurinkoEmail[]> {
    return this.request<AurinkoEmail[]>(
      `/v1/accounts/${accountId}/emails?limit=${limit}&offset=${offset}`
    )
  }

  async getEmail(accountId: string, messageId: string): Promise<AurinkoEmail> {
    return this.request<AurinkoEmail>(
      `/v1/accounts/${accountId}/emails/${messageId}`
    )
  }

  async sendEmail(accountId: string, email: SendEmailRequest): Promise<{ messageId: string }> {
    return this.request<{ messageId: string }>(
      `/v1/accounts/${accountId}/emails`,
      {
        method: 'POST',
        body: JSON.stringify({
          from: { email: email.from },
          to: email.to.map(e => ({ email: e })),
          cc: email.cc?.map(e => ({ email: e })),
          bcc: email.bcc?.map(e => ({ email: e })),
          subject: email.subject,
          body: email.body,
          bodyHtml: email.bodyHtml,
          threadId: email.threadId,
        }),
      }
    )
  }

  async syncEmails(
    accountId: string,
    since?: string
  ): Promise<{ added: AurinkoEmail[]; updated: AurinkoEmail[]; deleted: string[] }> {
    const params = new URLSearchParams()
    if (since) params.append('since', since)

    return this.request<{ added: AurinkoEmail[]; updated: AurinkoEmail[]; deleted: string[] }>(
      `/v1/accounts/${accountId}/emails/sync?${params.toString()}`
    )
  }

  // =========================================================================
  // CALENDAR/EVENT OPERATIONS (Scheduler)
  // =========================================================================

  async getEvents(accountId: string, startDate?: string, endDate?: string): Promise<AurinkoEvent[]> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    return this.request<AurinkoEvent[]>(
      `/v1/accounts/${accountId}/events?${params.toString()}`
    )
  }

  async getEvent(accountId: string, eventId: string): Promise<AurinkoEvent> {
    return this.request<AurinkoEvent>(
      `/v1/accounts/${accountId}/events/${eventId}`
    )
  }

  async createEvent(accountId: string, event: CreateEventRequest): Promise<AurinkoEvent> {
    return this.request<AurinkoEvent>(
      `/v1/accounts/${accountId}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    )
  }

  async updateEvent(accountId: string, eventId: string, event: Partial<CreateEventRequest>): Promise<AurinkoEvent> {
    return this.request<AurinkoEvent>(
      `/v1/accounts/${accountId}/events/${eventId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(event),
      }
    )
  }

  async deleteEvent(accountId: string, eventId: string): Promise<void> {
    await this.request(
      `/v1/accounts/${accountId}/events/${eventId}`,
      { method: 'DELETE' }
    )
  }

  // =========================================================================
  // CONTACT/CRM OPERATIONS
  // =========================================================================

  async getContacts(accountId: string, limit: number = 100, offset: number = 0): Promise<AurinkoContact[]> {
    return this.request<AurinkoContact[]>(
      `/v1/accounts/${accountId}/contacts?limit=${limit}&offset=${offset}`
    )
  }

  async getContact(accountId: string, contactId: string): Promise<AurinkoContact> {
    return this.request<AurinkoContact>(
      `/v1/accounts/${accountId}/contacts/${contactId}`
    )
  }

  async createContact(accountId: string, contact: CreateContactRequest): Promise<AurinkoContact> {
    return this.request<AurinkoContact>(
      `/v1/accounts/${accountId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify(contact),
      }
    )
  }

  async updateContact(accountId: string, contactId: string, contact: Partial<CreateContactRequest>): Promise<AurinkoContact> {
    return this.request<AurinkoContact>(
      `/v1/accounts/${accountId}/contacts/${contactId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(contact),
      }
    )
  }

  async deleteContact(accountId: string, contactId: string): Promise<void> {
    await this.request(
      `/v1/accounts/${accountId}/contacts/${contactId}`,
      { method: 'DELETE' }
    )
  }

  async searchContacts(accountId: string, query: string): Promise<AurinkoContact[]> {
    return this.request<AurinkoContact[]>(
      `/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(query)}`
    )
  }

  // =========================================================================
  // MAILBOX/ACCOUNT SESSIONS (End User Sessions)
  // =========================================================================

  async getAccounts(): Promise<AurinkoAccount[]> {
    return this.request<AurinkoAccount[]>('/v1/accounts')
  }

  async getAccount(accountId: string): Promise<AurinkoAccount> {
    return this.request<AurinkoAccount>(`/v1/accounts/${accountId}`)
  }

  async createConnection(
    emailAddress: string,
    provider: 'gmail' | 'outlook' | 'imap'
  ): Promise<{ authUrl: string; accountId: string }> {
    // Try /v1/connections first, fall back to /v1/connect for trial accounts
    try {
      return await this.request<{ authUrl: string; accountId: string }>(
        '/v1/connections',
        {
          method: 'POST',
          body: JSON.stringify({
            emailAddress,
            provider,
            scopes: [
              'email.read',
              'email.write',
              'calendar.read',
              'calendar.write',
              'contacts.read',
              'contacts.write',
            ],
          }),
        }
      )
    } catch (error) {
      // Try alternative endpoint for trial accounts
      return await this.request<{ authUrl: string; accountId: string }>(
        '/v1/connect',
        {
          method: 'POST',
          body: JSON.stringify({
            emailAddress,
            provider,
          }),
        }
      )
    }
  }

  async exchangeCodeForToken(code: string, accountId: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    return this.request<{
      accessToken: string
      refreshToken: string
      expiresIn: number
    }>(
      `/v1/accounts/${accountId}/exchange`,
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    )
  }

  // =========================================================================
  // SESSION MANAGEMENT (End User Sessions)
  // =========================================================================

  async createSession(request: CreateSessionRequest): Promise<MailboxSession> {
    return this.request<MailboxSession>(
      '/v1/sessions',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
  }

  async getSession(sessionId: string): Promise<MailboxSession> {
    return this.request<MailboxSession>(`/v1/sessions/${sessionId}`)
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.request(
      `/v1/sessions/${sessionId}`,
      { method: 'DELETE' }
    )
  }

  async refreshSessionToken(sessionId: string, refreshToken: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    return this.request<{
      accessToken: string
      refreshToken: string
      expiresIn: number
    }>(
      `/v1/sessions/${sessionId}/refresh`,
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    )
  }

  async listUserSessions(userId: string): Promise<MailboxSession[]> {
    return this.request<MailboxSession[]>(`/v1/users/${userId}/sessions`)
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.request(
      `/v1/users/${userId}/sessions`,
      { method: 'DELETE' }
    )
  }

  // =========================================================================
  // WEBHOOKS
  // =========================================================================

  async createWebhook(
    accountId: string,
    url: string,
    events: string[]
  ): Promise<{ webhookId: string }> {
    return this.request<{ webhookId: string }>(
      `/v1/accounts/${accountId}/webhooks`,
      {
        method: 'POST',
        body: JSON.stringify({ url, events }),
      }
    )
  }

  async deleteWebhook(accountId: string, webhookId: string): Promise<void> {
    await this.request(
      `/v1/accounts/${accountId}/webhooks/${webhookId}`,
      { method: 'DELETE' }
    )
  }
}

export const aurinkoClient = new AurinkoClient()
export type {
  AurinkoEmail,
  SendEmailRequest,
  AurinkoEvent,
  CreateEventRequest,
  AurinkoContact,
  CreateContactRequest,
  AurinkoAccount,
  MailboxSession,
  CreateSessionRequest,
}
