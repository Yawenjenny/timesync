import { CreateMeetingForm } from '@/components/CreateMeetingForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            TimeSync
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect meeting time across time zones.
            No sign-up required - just share a link and let everyone pick their available times.
          </p>
        </div>

        {/* Main Form */}
        <CreateMeetingForm />

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            TimeSync automatically calculates overlapping availability and sends results to all participants.
          </p>
        </footer>
      </main>
    </div>
  )
}
