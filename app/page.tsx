import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmailList } from '@/components/email-list'
import { ComposeButton } from '@/components/compose-button'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex overflow-hidden">
          <EmailList />
        </main>
      </div>
      <ComposeButton />
    </div>
  )
}
