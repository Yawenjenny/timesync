import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateOverlap } from '@/lib/overlap'
import { sendResultsEmail } from '@/lib/email'
import { getAISuggestion } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params
    const body = await request.json()

    const { name, email, timezone, availability } = body

    // Validate required fields
    if (!name || !email || !timezone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!availability || availability.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one available time slot' },
        { status: 400 }
      )
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            availability: true,
          },
        },
      },
    })

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check if participant already exists (by email)
    const existingParticipant = meeting.participants.find(p => p.email === email)

    let participant
    if (existingParticipant) {
      // Update existing participant's availability
      await prisma.availability.deleteMany({
        where: { participantId: existingParticipant.id },
      })

      participant = await prisma.participant.update({
        where: { id: existingParticipant.id },
        data: {
          name,
          timezone,
          availability: {
            create: availability.map((slot: { start: string; end: string }) => ({
              startTime: new Date(slot.start),
              endTime: new Date(slot.end),
            })),
          },
        },
        include: {
          availability: true,
        },
      })
    } else {
      // Create new participant
      participant = await prisma.participant.create({
        data: {
          meetingId,
          name,
          email,
          timezone,
          availability: {
            create: availability.map((slot: { start: string; end: string }) => ({
              startTime: new Date(slot.start),
              endTime: new Date(slot.end),
            })),
          },
        },
        include: {
          availability: true,
        },
      })
    }

    // Fetch updated meeting with all participants
    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            availability: true,
          },
        },
      },
    })

    if (!updatedMeeting) {
      return NextResponse.json(
        { error: 'Meeting not found after update' },
        { status: 500 }
      )
    }

    // Check if all expected participants have responded
    const participantCount = updatedMeeting.participants.length
    const isComplete = participantCount >= updatedMeeting.expectedParticipants

    if (isComplete) {
      // Mark meeting as completed
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'COMPLETED' },
      })

      // Calculate overlap
      const overlapResult = calculateOverlap(
        updatedMeeting.participants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          timezone: p.timezone,
          availability: p.availability.map(a => ({
            start: a.startTime,
            end: a.endTime,
          })),
        })),
        updatedMeeting.slotDuration
      )

      // Get AI suggestion if no overlap
      let aiSuggestion = null
      if (!overlapResult.hasOverlap) {
        aiSuggestion = await getAISuggestion(
          updatedMeeting.participants.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            timezone: p.timezone,
            availability: p.availability.map(a => ({
              start: a.startTime,
              end: a.endTime,
            })),
          })),
          updatedMeeting.slotDuration,
          new Date(updatedMeeting.dateRangeStart),
          new Date(updatedMeeting.dateRangeEnd)
        )
      }

      // Send emails to all participants (don't block response if email fails)
      try {
        await sendResultsEmail(
          updatedMeeting.participants.map(p => ({
            name: p.name,
            email: p.email,
            timezone: p.timezone,
          })),
          overlapResult,
          aiSuggestion
        )
      } catch (emailError) {
        console.error('Failed to send emails:', emailError)
        // Continue anyway - don't fail the whole request
      }

      return NextResponse.json({
        participant,
        isComplete: true,
        overlap: overlapResult,
        aiSuggestion,
      })
    }

    return NextResponse.json({
      participant,
      isComplete: false,
      participantsRemaining: updatedMeeting.expectedParticipants - participantCount,
    })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: 'Failed to add participant' },
      { status: 500 }
    )
  }
}
