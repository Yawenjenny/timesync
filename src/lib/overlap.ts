import { ParticipantWithAvailability, TimeSlot, OverlapResult, MeetingType } from '@/types'

export function calculateOverlap(
  participants: ParticipantWithAvailability[],
  slotDuration: number,
  meetingType: MeetingType = 'ONE_TIME'
): OverlapResult {
  if (participants.length === 0) {
    return { hasOverlap: false, overlappingSlots: [] }
  }

  if (participants.length === 1) {
    return {
      hasOverlap: true,
      overlappingSlots: participants[0].availability,
    }
  }

  if (meetingType === 'RECURRING') {
    return calculateRecurringOverlap(participants, slotDuration)
  }

  // Get all unique time slot starts across all participants
  const allSlots = new Map<number, number>() // timestamp -> count

  participants.forEach(participant => {
    participant.availability.forEach(slot => {
      const startTime = new Date(slot.start).getTime()
      allSlots.set(startTime, (allSlots.get(startTime) || 0) + 1)
    })
  })

  // Find slots where ALL participants are available
  const overlappingSlots: TimeSlot[] = []
  const participantCount = participants.length

  allSlots.forEach((count, timestamp) => {
    if (count === participantCount) {
      overlappingSlots.push({
        start: new Date(timestamp),
        end: new Date(timestamp + slotDuration * 60 * 1000),
      })
    }
  })

  // Sort by start time
  overlappingSlots.sort((a, b) => a.start.getTime() - b.start.getTime())

  // Merge consecutive slots
  const mergedSlots: TimeSlot[] = []
  for (const slot of overlappingSlots) {
    if (mergedSlots.length === 0) {
      mergedSlots.push({ ...slot })
    } else {
      const lastSlot = mergedSlots[mergedSlots.length - 1]
      if (lastSlot.end.getTime() === slot.start.getTime()) {
        lastSlot.end = slot.end
      } else {
        mergedSlots.push({ ...slot })
      }
    }
  }

  return {
    hasOverlap: mergedSlots.length > 0,
    overlappingSlots: mergedSlots,
  }
}

// For recurring meetings, we match by dayOfWeek + time instead of exact timestamp
function calculateRecurringOverlap(
  participants: ParticipantWithAvailability[],
  slotDuration: number
): OverlapResult {
  // Create a key from dayOfWeek + hour + minute
  const allSlots = new Map<string, { count: number; slot: TimeSlot }>()

  participants.forEach(participant => {
    participant.availability.forEach(slot => {
      const dayOfWeek = slot.dayOfWeek ?? new Date(slot.start).getDay()
      const startDate = new Date(slot.start)
      const hours = startDate.getUTCHours()
      const minutes = startDate.getUTCMinutes()
      const key = `${dayOfWeek}-${hours}-${minutes}`

      if (!allSlots.has(key)) {
        allSlots.set(key, { count: 1, slot: { ...slot, dayOfWeek } })
      } else {
        allSlots.get(key)!.count++
      }
    })
  })

  // Find slots where ALL participants are available
  const overlappingSlots: TimeSlot[] = []
  const participantCount = participants.length

  allSlots.forEach(({ count, slot }) => {
    if (count === participantCount) {
      overlappingSlots.push(slot)
    }
  })

  // Sort by dayOfWeek then by time
  overlappingSlots.sort((a, b) => {
    const dayA = a.dayOfWeek ?? 0
    const dayB = b.dayOfWeek ?? 0
    if (dayA !== dayB) return dayA - dayB
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })

  // Merge consecutive slots within the same day
  const mergedSlots: TimeSlot[] = []
  for (const slot of overlappingSlots) {
    if (mergedSlots.length === 0) {
      mergedSlots.push({ ...slot })
    } else {
      const lastSlot = mergedSlots[mergedSlots.length - 1]
      const sameDayOfWeek = lastSlot.dayOfWeek === slot.dayOfWeek
      const consecutive = lastSlot.end.getTime() === slot.start.getTime()

      if (sameDayOfWeek && consecutive) {
        lastSlot.end = slot.end
      } else {
        mergedSlots.push({ ...slot })
      }
    }
  }

  return {
    hasOverlap: mergedSlots.length > 0,
    overlappingSlots: mergedSlots,
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatSlotInTimezone(
  slot: TimeSlot,
  timezone: string,
  isRecurring: boolean = false
): { date: string; startTime: string; endTime: string } {
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  // For recurring meetings, show "Every [Day]" instead of specific date
  if (isRecurring && slot.dayOfWeek !== undefined) {
    return {
      date: `Every ${DAY_NAMES[slot.dayOfWeek]}`,
      startTime: new Date(slot.start).toLocaleTimeString('en-US', timeOptions),
      endTime: new Date(slot.end).toLocaleTimeString('en-US', timeOptions),
    }
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }

  return {
    date: new Date(slot.start).toLocaleDateString('en-US', options),
    startTime: new Date(slot.start).toLocaleTimeString('en-US', timeOptions),
    endTime: new Date(slot.end).toLocaleTimeString('en-US', timeOptions),
  }
}

export function getTopOverlappingSlots(
  overlappingSlots: TimeSlot[],
  limit: number = 3
): TimeSlot[] {
  // Sort by duration (longest first), then by start time
  const sorted = [...overlappingSlots].sort((a, b) => {
    const durationA = a.end.getTime() - a.start.getTime()
    const durationB = b.end.getTime() - b.start.getTime()
    if (durationB !== durationA) return durationB - durationA
    return a.start.getTime() - b.start.getTime()
  })

  return sorted.slice(0, limit)
}
