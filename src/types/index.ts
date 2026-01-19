export interface TimeSlot {
  start: Date
  end: Date
}

export interface CreateMeetingInput {
  organizerName: string
  organizerEmail: string
  organizerTimezone: string
  expectedParticipants: number
  dateRangeStart: Date
  dateRangeEnd: Date
  slotDuration: 15 | 30 | 60
  availability: TimeSlot[]
}

export interface AddParticipantInput {
  meetingId: string
  name: string
  email: string
  timezone: string
  availability: TimeSlot[]
}

export interface MeetingWithParticipants {
  id: string
  organizerName: string
  organizerEmail: string
  organizerTimezone: string
  expectedParticipants: number
  dateRangeStart: Date
  dateRangeEnd: Date
  slotDuration: number
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: Date
  participants: ParticipantWithAvailability[]
}

export interface ParticipantWithAvailability {
  id: string
  name: string
  email: string
  timezone: string
  availability: TimeSlot[]
}

export interface OverlapResult {
  hasOverlap: boolean
  overlappingSlots: TimeSlot[]
}

export interface AISuggestion {
  suggestedTime: TimeSlot
  reasoning: string
  participantImpact: {
    name: string
    localTime: string
    inconvenienceLevel: 'ideal' | 'good' | 'workable' | 'difficult'
  }[]
}
