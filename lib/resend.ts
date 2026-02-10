// Resend Email API Client
// Use Resend for sending emails with attachments when Nylas ECC is limited

const RESEND_API_URL = 'https://api.resend.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY

export interface ResendAttachment {
  filename: string
  content: string // Base64 encoded
  path?: string
}

export interface ResendEmail {
  from?: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
  attachments?: ResendAttachment[]
}

export async function sendEmailWithResend(email: ResendEmail) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  try {
    const response = await fetch(`${RESEND_API_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: email.from || 'Nexus Mail <onboarding@resend.dev>',
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.reply_to,
        attachments: email.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Resend] Send email error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    return data
  } catch (error) {
    console.error('[Resend] Send email error:', error)
    throw error
  }
}

export const resendClient = {
  sendEmail: sendEmailWithResend,
}

// Also export the function directly
export { sendEmailWithResend as sendEmail }
