# Nexus Mail

An AI-powered email client with smart features built using modern full-stack technologies.

## Features

- **User Authentication**: Secure login with Supabase Auth (email/password and Google OAuth)
- **Email Management**: Send, receive, and manage emails with Nylas API integration
- **AI-Powered Email Summarization**: Automatic email summarization using OpenAI
- **Smart Email Categorization**: Automatic categorization into Primary, Social, Promotions, etc.
- **Semantic Email Search**: Vector-based search using Pinecone for intelligent search results
- **AI-Assisted Reply Suggestions**: Get AI-generated reply suggestions
- **Clean, Responsive UI**: Modern interface using shadcn/ui components
- **Real-time Updates**: Supabase for real-time email syncing

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL with Prisma ORM
- **Email Integration**: Nylas API (Email + Calendar + Contacts)
- **Vector Database**: Pinecone
- **AI**: OpenAI GPT-3.5
- **UI Components**: shadcn/ui
- **Authentication**: Supabase Auth

## Nylas API Configuration

This app uses the following Nylas API features:

### Email API
- **Purpose**: Send and receive emails
- **Scopes required**:
  - `email.read` - Read emails
  - `email.write` - Send and modify emails

### Calendar API
- **Purpose**: Event scheduling and management
- **Scopes required**:
  - `calendar.read` - Read events
  - `calendar.write` - Create and modify events

### Contacts API
- **Purpose**: CRM contact management
- **Scopes required**:
  - `contacts.read` - Read contacts
  - `contacts.write` - Create and modify contacts

### Provider Options
When connecting email accounts, the app supports:
- **Gmail** - Google Mail integration
- **Outlook** - Microsoft 365 integration
- **IMAP** - Generic IMAP connection

### Supported Providers
- `gmail` - Google Gmail
- `outlook` - Microsoft Outlook/Office 365
- `imap` - Generic IMAP servers

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase account
- Nylas account (for email, calendar, contacts integration)
- Pinecone account (for vector search)
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nexus-mail
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Nylas
NYLAS_CLIENT_ID="your-nylas-client-id"
NYLAS_CLIENT_SECRET="your-nylas-client-secret"
NYLAS_API_URL="https://api.us.nylas.com"

# Pinecone
PINECONE_API_KEY="..."
PINECONE_INDEX_NAME="nexus-mail-emails"

# OpenAI
OPENAI_API_KEY="..."
```

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
nexus-mail/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication callbacks
│   │   ├── emails/        # Email CRUD operations
│   │   ├── connections/    # Email connection management
│   │   └── webhooks/      # Nylas webhooks
│   ├── login/             # Login page
│   ├── connect/           # Email connection page
│   ├── email/             # Email detail view
│   ├── category/          # Category views
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── email-list.tsx     # Email list component
│   ├── compose-modal.tsx  # Compose email modal
│   ├── sidebar.tsx       # Navigation sidebar
│   └── header.tsx         # Header component
├── lib/                   # Utility functions & integrations
│   ├── supabase/         # Supabase client
│   ├── nylas.ts          # Nylas API client (Email + Calendar + Contacts)
│   ├── pinecone.ts       # Pinecone vector database
│   └── openai.ts         # OpenAI AI features
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema definition
└── types/                # TypeScript types
    └── index.ts          # Shared types
```

## API Routes

### Email Routes
- `GET /api/emails` - List emails
- `POST /api/emails` - Send email
- `GET /api/emails/[id]` - Get email details
- `PUT /api/emails/[id]` - Update email (mark read/starred)
- `DELETE /api/emails/[id]` - Delete/trash email
- `POST /api/emails/[id]/summarize` - Generate AI summary
- `POST /api/emails/[id]/reply` - Generate AI reply suggestion

### Connection Routes
- `GET /api/connections` - List connected email accounts
- `POST /api/connections` - Create new connection
- `DELETE /api/connections/[id]` - Disconnect email account
- `POST /api/connections/[id]/sync` - Sync emails from connected account

### Webhooks
- `POST /api/nylas/callback` - Nylas OAuth callback
- `POST /api/webhooks/aurinko` - Aurinko webhook handler for email events

## Database Schema

### Core Tables
- **User** - App users
- **EmailConnection** - Connected email accounts via Nylas
- **Email** - Email messages
- **Category** - Email categories (Primary, Social, etc.)
- **Draft** - Email drafts

### Session Management
- **Session** - User sessions

## AI Features

### Email Summarization
Automatically generates concise summaries for incoming emails using OpenAI GPT-3.5.

### Smart Categorization
AI-powered categorization into Gmail-style tabs (Primary, Social, Promotions, Updates, Forums).

### Semantic Search
Uses Pinecone vector embeddings to enable intelligent search beyond keyword matching.

### Reply Suggestions
AI-generated suggested replies based on email content.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Database Setup for Production

1. Create a PostgreSQL database (Supabase provides this)
2. Run migrations:
```bash
npx prisma migrate deploy
```

## License

MIT License - feel free to use this project for learning and development.
