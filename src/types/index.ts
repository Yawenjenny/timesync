export interface TimeSlot {
  start: Date
  end: Date
  dayOfWeek?: number // 0-6 for recurring meetings (0=Sunday, 1=Monday, etc.)
}

export type MeetingType = 'ONE_TIME' | 'RECURRING'

export interface CreateMeetingInput {
  organizerName: string
  organizerEmail: string
  organizerTimezone: string
  expectedParticipants: number
  meetingType: MeetingType
  dateRangeStart: Date
  dateRangeEnd: Date
  selectedDates?: Date[] // For one-time meetings: specific dates
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
  meetingType: MeetingType
  dateRangeStart: Date
  dateRangeEnd: Date
  selectedDates: Date[]
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
