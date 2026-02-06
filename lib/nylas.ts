// Nylas Email API Client
// Documentation: https://docs.nylas.com/docs

const NYLAS_API_URL = process.env.NYLAS_API_URL || 'https://api.nylas.com'
const NYLAS_CLIENT_ID = process.env.NYLAS_CLIENT_ID!
const NYLAS_CLIENT_SECRET = process.env.NYLAS_CLIENT_SECRET!

interface NylasEmail {
  id: string
  object: 'message'
  from: Array<{ email: string; name?: string }>
  to: Array<{ email: string; name?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject: string
  body: string
  snippet?: string
  received_at: number | string
  sent_at?: number
  unread: boolean
  starred: boolean
  folder?: { name: string; id: string }
  labels?: Array<{ name: string; id: string }>
}

interface NylasGrant {
  id: string
  provider: 'gmail' | 'outlook' | 'imap'
  email: string
  name?: string
  scope: string[]
  status: 'active' | 'pending' | 'error'
  created_at: number
}

interface SendEmailRequest {
  from: { email: string }
  to: Array<{ email: string; name?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject: string
  body: string
  reply_to?: { email: string; name?: string }
  tracking?: { open: boolean; link_click: boolean }
}

class NylasClient {
  private getAuthHeader(): string {
    return `Bearer ${NYLAS_CLIENT_SECRET}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${NYLAS_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Nylas API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // =========================================================================
  // OAUTH - Create Connect URL
  // =========================================================================

  async createConnectUrl(
    emailAddress: string,
    provider: 'gmail' | 'outlook'
  ): Promise<{ url: string; state: string }> {
    const state = Buffer.from(JSON.stringify({ email: emailAddress })).toString('base64')
    
    const params = new URLSearchParams({
      client_id: NYLAS_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
      state,
      login_hint: emailAddress,
      provider,
      scope: 'email,calendar,contacts',
      response_type: 'code',
    })

    return {
      url: `${NYLAS_API_URL}/oauth/authorize?${params.toString()}`,
      state,
    }
  }

  // =========================================================================
  // OAUTH - Exchange Code for Token
  // =========================================================================

  async exchangeCode(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    account_id: string
    grant_id: string
  }> {
    return this.request('/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: NYLAS_CLIENT_ID,
        client_secret: NYLAS_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
        grant_type: 'authorization_code',
      }),
    })
  }

  // =========================================================================
  // GRANTS (Connected Accounts)
  // =========================================================================

  async listGrants(): Promise<NylasGrant[]> {
    return this.request<NylasGrant[]>('/v3/grants')
  }

  async getGrant(grantId: string): Promise<NylasGrant> {
    return this.request<NylasGrant>(`/v3/grants/${grantId}`)
  }

  async deleteGrant(grantId: string): Promise<void> {
    await this.request(`/v3/grants/${grantId}`, {
      method: 'DELETE',
    })
  }

  // =========================================================================
  // EMAILS
  // =========================================================================

  async getEmails(grantId: string, limit: number = 50, offset: number = 0): Promise<{ data: NylasEmail[] }> {
    return this.request<{ data: NylasEmail[] }>(
      `/v3/grants/${grantId}/messages?limit=${limit}&offset=${offset}`
    )
  }

  async getEmail(grantId: string, messageId: string): Promise<NylasEmail> {
    return this.request<NylasEmail>(`/v3/grants/${grantId}/messages/${messageId}`)
  }

  async sendEmail(grantId: string, email: SendEmailRequest): Promise<NylasEmail> {
    return this.request<NylasEmail>(`/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      body: JSON.stringify({
        ...email,
        object: 'message',
      }),
    })
  }

  // =========================================================================
  // FOLDERS/LABELS
  // =========================================================================

  async getFolders(grantId: string): Promise<{ data: Array<{ id: string; name: string; object: 'folder' }> }> {
    return this.request<{ data: Array<{ id: string; name: string; object: 'folder' }> }>(
      `/v3/grants/${grantId}/folders`
    )
  }

  async getLabels(grantId: string): Promise<{ data: Array<{ id: string; name: string; object: 'label' }> }> {
    return this.request<{ data: Array<{ id: string; name: string; object: 'label' }> }>(
      `/v3/grants/${grantId}/labels`
    )
  }

  // =========================================================================
  // CALENDAR
  // =========================================================================

  async getCalendars(grantId: string): Promise<{ data: Array<{ id: string; name: string; description?: string }> }> {
    return this.request<{ data: Array<{ id: string; name: string; description?: string }> }>(
      `/v3/grants/${grantId}/calendars`
    )
  }

  // =========================================================================
  // CONTACTS
  // =========================================================================

  async getContacts(grantId: string, limit: number = 100): Promise<{ data: Array<{ id: string; object: 'contact' }> }> {
    return this.request<{ data: Array<{ id: string; object: 'contact' }> }>(
      `/v3/grants/${grantId}/contacts?limit=${limit}`
    )
  }
}

export const nylasClient = new NylasClient()
export type {
  NylasEmail,
  NylasGrant,
  SendEmailRequest,
}
