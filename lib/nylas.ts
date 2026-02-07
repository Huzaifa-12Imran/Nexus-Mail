// Nylas Email API Client
// Using raw fetch to interact with Nylas v3 API
// Note: New email connections may need to be added through the Nylas Dashboard

const NYLAS_API_URL = process.env.NYLAS_API_URL || 'https://api.us.nylas.com'
const NYLAS_API_KEY = process.env.NEXT_PUBLIC_NYLAS_API_KEY!
const NYLAS_CLIENT_ID = process.env.NYLAS_CLIENT_ID!
const NYLAS_CLIENT_SECRET = process.env.NYLAS_CLIENT_SECRET!
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================================================
// OAUTH - Create Connect URL
// ============================================================================

export async function createConnectUrl(
  emailAddress: string,
  provider: 'gmail' | 'outlook' | 'imap'
): Promise<{ url: string; state: string }> {
  const state = Buffer.from(JSON.stringify({ email: emailAddress })).toString('base64')
  
  // Try the Nylas v3 Connect authorize endpoint
  const url = `${NYLAS_API_URL}/v3/connect/authorize?${new URLSearchParams({
    client_id: NYLAS_CLIENT_ID,
    redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
    login_hint: emailAddress,
    state,
    provider,
  }).toString()}`
  
  console.log('[Nylas] Generated auth URL:', url)
  
  return {
    url,
    state,
  }
}

// ============================================================================
// OAUTH - Exchange Code for Token
// ============================================================================

export async function exchangeCode(code: string) {
  console.log('[Nylas] Exchanging code for token...')
  
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: NYLAS_CLIENT_ID,
        client_secret: NYLAS_CLIENT_SECRET,
        code,
        redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
        grant_type: 'authorization_code',
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Token exchange error:', data)
      
      // If OAuth endpoints don't work, suggest using Nylas Dashboard
      if (data.error?.type === 'not_found_error') {
        throw new Error('OAuth endpoint not available. Please add email accounts through the Nylas Dashboard: https://dashboard.nylas.com')
      }
      
      throw new Error(data.error?.message || 'Failed to exchange code for token')
    }
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      account_id: data.account_id,
      grant_id: data.grant_id,
    }
  } catch (error) {
    console.error('[Nylas] Token exchange error:', error)
    throw error
  }
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

export async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: NYLAS_CLIENT_ID,
        client_secret: NYLAS_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      if (data.error?.type === 'not_found_error') {
        throw new Error('Token refresh endpoint not available')
      }
      console.error('[Nylas] Token refresh error:', data)
      throw new Error(data.error?.message || 'Failed to refresh token')
    }
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      grant_id: data.grant_id,
    }
  } catch (error) {
    console.error('[Nylas] Token refresh error:', error)
    throw error
  }
}

// ============================================================================
// GRANTS (Connected Accounts)
// ============================================================================

export async function listGrants() {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] List grants error:', data)
      throw new Error(data.error?.message || 'Failed to list grants')
    }
    
    return data.data || []
  } catch (error) {
    console.error('[Nylas] List grants error:', error)
    throw error
  }
}

export async function getGrant(grantId: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get grant error:', data)
      throw new Error(data.error?.message || 'Failed to get grant')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get grant error:', error)
    throw error
  }
}

export async function deleteGrant(grantId: string): Promise<void> {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const data = await response.json()
      console.error('[Nylas] Delete grant error:', data)
      throw new Error(data.error?.message || 'Failed to delete grant')
    }
  } catch (error) {
    console.error('[Nylas] Delete grant error:', error)
    throw error
  }
}

// ============================================================================
// EMAILS (Messages) - Access via grant_id
// ============================================================================

export async function getEmails(grantId: string, limit: number = 50, offset: number = 0) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/messages?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get emails error:', data)
      throw new Error(data.error?.message || 'Failed to get emails')
    }
    
    return data
  } catch (error) {
    console.error('[Nylas] Get emails error:', error)
    throw error
  }
}

export async function getEmail(grantId: string, messageId: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get email error:', data)
      throw new Error(data.error?.message || 'Failed to get email')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get email error:', error)
    throw error
  }
}

export async function sendEmail(grantId: string, email: {
  from: { email: string }
  to: Array<{ email: string; name?: string }>
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  subject: string
  body: string
  reply_to?: { email: string; name?: string }
}) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: [email.from],
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        body: email.body,
        reply_to: email.reply_to ? [email.reply_to] : undefined,
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Send email error:', data)
      throw new Error(data.error?.message || 'Failed to send email')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Send email error:', error)
    throw error
  }
}

// ============================================================================
// FOLDERS
// ============================================================================

export async function getFolders(grantId: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/folders`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get folders error:', data)
      throw new Error(data.error?.message || 'Failed to get folders')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get folders error:', error)
    throw error
  }
}

// ============================================================================
// LABELS (for Gmail)
// ============================================================================

export async function getLabels(grantId: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/labels`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get labels error:', data)
      throw new Error(data.error?.message || 'Failed to get labels')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get labels error:', error)
    throw error
  }
}

// ============================================================================
// CALENDARS
// ============================================================================

export async function getCalendars(grantId: string) {
  try {
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/calendars`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get calendars error:', data)
      throw new Error(data.error?.message || 'Failed to get calendars')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get calendars error:', error)
    throw error
  }
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function getContacts(grantId: string, limit: number = 100) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
    })
    
    const response = await fetch(`${NYLAS_API_URL}/v3/grants/${grantId}/contacts?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('[Nylas] Get contacts error:', data)
      throw new Error(data.error?.message || 'Failed to get contacts')
    }
    
    return data.data
  } catch (error) {
    console.error('[Nylas] Get contacts error:', error)
    throw error
  }
}

// ============================================================================
// NYLAS CLIENT EXPORT (for backward compatibility)
// ============================================================================

export const nylasClient = {
  createConnectUrl,
  exchangeCode,
  refreshAccessToken,
  listGrants,
  getGrant,
  deleteGrant,
  getEmails,
  getEmail,
  sendEmail,
  getFolders,
  getLabels,
  getCalendars,
  getContacts,
}
