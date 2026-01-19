import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ParticipantForm } from '@/components/ParticipantForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingPage({ params }: PageProps) {
  const { id } = await params

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          availability: true,
        },
      },
    },
  })

  if (!meeting) {
    notFound()
  }

  const participantCount = meeting.participants.length
  const isComplete = participantCount >= meeting.expectedParticipants

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">TimeSync</h1>
          <p className="text-lg text-muted-foreground">
            Meeting created by <strong>{meeting.organizerName}</strong>
          </p>
        </div>

        {isComplete ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-semibold mb-2">
              All Participants Have Responded
            </h2>
            <p className="text-muted-foreground">
              Check your email for the meeting results.
            </p>
          </div>
        ) : (
          <ParticipantForm
            meetingId={meeting.id}
            organizerName={meeting.organizerName}
            dateRangeStart={meeting.dateRangeStart}
            dateRangeEnd={meeting.dateRangeEnd}
            slotDuration={meeting.slotDuration as 15 | 30 | 60}
            expectedParticipants={meeting.expectedParticipants}
            currentParticipants={participantCount}
            existingParticipants={meeting.participants.map(p => ({
              id: p.id,
              name: p.name,
              email: p.email,
              timezone: p.timezone,
              availability: p.availability.map(a => ({
                start: a.startTime,
                end: a.endTime,
              })),
            }))}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            {participantCount} of {meeting.expectedParticipants} participants
            have responded
          </p>
        </footer>
      </main>
    </div>
  )
}
