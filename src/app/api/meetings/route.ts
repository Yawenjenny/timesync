import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      organizerName,
      organizerEmail,
      organizerTimezone,
      expectedParticipants,
      dateRangeStart,
      dateRangeEnd,
      slotDuration,
      availability,
      meetingType = 'ONE_TIME',
      selectedDates = [],
    } = body

    // Validate required fields
    if (!organizerName || !organizerEmail || !organizerTimezone) {
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

    // Create meeting with organizer as first participant
    const meeting = await prisma.meeting.create({
      data: {
        organizerName,
        organizerEmail,
        organizerTimezone,
        expectedParticipants: parseInt(expectedParticipants),
        dateRangeStart: new Date(dateRangeStart),
        dateRangeEnd: new Date(dateRangeEnd),
        slotDuration: parseInt(slotDuration),
        meetingType,
        selectedDates: selectedDates.map((d: string) => new Date(d)),
        participants: {
          create: {
            name: organizerName,
            email: organizerEmail,
            timezone: organizerTimezone,
            availability: {
              create: availability.map((slot: { start: string; end: string; dayOfWeek?: number }) => ({
                startTime: new Date(slot.start),
                endTime: new Date(slot.end),
                ...(slot.dayOfWeek !== undefined ? { dayOfWeek: slot.dayOfWeek } : {}),
              })),
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            availability: true,
          },
        },
      },
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Error creating meeting:', error)
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    )
  }
}
