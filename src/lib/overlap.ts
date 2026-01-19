import { ParticipantWithAvailability, TimeSlot, OverlapResult } from '@/types'

export function calculateOverlap(
  participants: ParticipantWithAvailability[],
  slotDuration: number
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

export function formatSlotInTimezone(
  slot: TimeSlot,
  timezone: string
): { date: string; startTime: string; endTime: string } {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
