import { EmailList } from '@/components/email-list'
import { ComposeButton } from '@/components/compose-button'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default function PrimaryPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex overflow-hidden">
          <EmailList category="primary" />
        </main>
      </div>
      <ComposeButton />
    </div>
  )
}
