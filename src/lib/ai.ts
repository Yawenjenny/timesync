import OpenAI from 'openai'
import { ParticipantWithAvailability, AISuggestion, TimeSlot } from '@/types'
import { formatSlotInTimezone } from './overlap'
import { addMinutes, eachDayOfInterval, setHours, setMinutes, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function getAISuggestion(
  participants: ParticipantWithAvailability[],
  slotDuration: number,
  dateRangeStart: Date,
  dateRangeEnd: Date
): Promise<AISuggestion | null> {
  try {
    // Generate all possible time slots in the date range
    const allPossibleSlots = generateAllPossibleSlots(
      dateRangeStart,
      dateRangeEnd,
      slotDuration
    )

    // Calculate score for each slot based on participant availability
    const scoredSlots = allPossibleSlots.map(slot => ({
      slot,
      score: calculateSlotScore(slot, participants),
      availableCount: countAvailableParticipants(slot, participants),
    }))

    // Sort by score (higher is better) and then by available count
    scoredSlots.sort((a, b) => {
      if (b.availableCount !== a.availableCount) {
        return b.availableCount - a.availableCount
      }
      return b.score - a.score
    })

    // Get top candidates
    const topCandidates = scoredSlots.slice(0, 5)

    if (topCandidates.length === 0) {
      return null
    }

    // Use AI to analyze and pick the best option with reasoning
    const prompt = buildPrompt(participants, topCandidates, slotDuration)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful meeting scheduler assistant. Your job is to analyze potential meeting times and suggest the best compromise time when there's no perfect overlap. Consider:
1. Time zone fairness - don't always inconvenience the same region
2. Reasonable working hours (8 AM - 9 PM local time is ideal, 6 AM - 10 PM is acceptable)
3. The number of people who can attend

Respond in JSON format with:
{
  "selectedSlotIndex": <index of the selected slot from candidates>,
  "reasoning": "<brief explanation of why this time was chosen>",
  "participantImpact": [
    {
      "name": "<participant name>",
      "localTime": "<time in their local timezone>",
      "inconvenienceLevel": "<ideal|good|workable|difficult>"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const result = JSON.parse(content)
    const selectedSlot = topCandidates[result.selectedSlotIndex]?.slot

    if (!selectedSlot) {
      // Fallback to the first candidate
      const fallbackSlot = topCandidates[0]?.slot
      if (!fallbackSlot) return null

      return {
        suggestedTime: fallbackSlot,
        reasoning: 'This time has the most participants available.',
        participantImpact: participants.map(p => {
          const formatted = formatSlotInTimezone(fallbackSlot, p.timezone)
          return {
            name: p.name,
            localTime: `${formatted.startTime} - ${formatted.endTime}`,
            inconvenienceLevel: getInconvenienceLevel(fallbackSlot, p.timezone),
          }
        }),
      }
    }

    return {
      suggestedTime: selectedSlot,
      reasoning: result.reasoning,
      participantImpact: result.participantImpact,
    }
  } catch (error) {
    console.error('Error getting AI suggestion:', error)

    // Fallback: return the slot with most availability
    const allSlots = generateAllPossibleSlots(dateRangeStart, dateRangeEnd, slotDuration)
    const bestSlot = allSlots
      .map(slot => ({
        slot,
        count: countAvailableParticipants(slot, participants),
      }))
      .sort((a, b) => b.count - a.count)[0]

    if (!bestSlot) return null

    return {
      suggestedTime: bestSlot.slot,
      reasoning: 'This time has the most participants available.',
      participantImpact: participants.map(p => {
        const formatted = formatSlotInTimezone(bestSlot.slot, p.timezone)
        return {
          name: p.name,
          localTime: `${formatted.startTime} - ${formatted.endTime}`,
          inconvenienceLevel: getInconvenienceLevel(bestSlot.slot, p.timezone),
        }
      }),
    }
  }
}

function generateAllPossibleSlots(
  startDate: Date,
  endDate: Date,
  slotDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  for (const day of days) {
    // Generate slots from 8 AM to 9 PM
    for (let hour = 8; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = setMinutes(setHours(day, hour), minute)
        const slotEnd = addMinutes(slotStart, slotDuration)
        slots.push({ start: slotStart, end: slotEnd })
      }
    }
  }

  return slots
}

function calculateSlotScore(
  slot: TimeSlot,
  participants: ParticipantWithAvailability[]
): number {
  let score = 0

  for (const participant of participants) {
    // Check if participant is available at this time
    const isAvailable = participant.availability.some(avail => {
      const availStart = new Date(avail.start).getTime()
      const availEnd = new Date(avail.end).getTime()
      return slot.start.getTime() >= availStart && slot.end.getTime() <= availEnd
    })

    if (isAvailable) {
      score += 10
    }

    // Add score based on how reasonable the time is in their timezone
    const localHour = getLocalHour(slot.start, participant.timezone)
    if (localHour >= 9 && localHour <= 17) {
      score += 5 // Business hours
    } else if (localHour >= 8 && localHour <= 20) {
      score += 3 // Reasonable hours
    } else if (localHour >= 6 && localHour <= 22) {
      score += 1 // Acceptable hours
    }
  }

  return score
}

function countAvailableParticipants(
  slot: TimeSlot,
  participants: ParticipantWithAvailability[]
): number {
  return participants.filter(participant =>
    participant.availability.some(avail => {
      const availStart = new Date(avail.start).getTime()
      const availEnd = new Date(avail.end).getTime()
      return slot.start.getTime() >= availStart && slot.end.getTime() <= availEnd
    })
  ).length
}

function getLocalHour(date: Date, timezone: string): number {
  try {
    const localDate = toZonedTime(date, timezone)
    return localDate.getHours()
  } catch {
    return date.getHours()
  }
}

function getInconvenienceLevel(
  slot: TimeSlot,
  timezone: string
): 'ideal' | 'good' | 'workable' | 'difficult' {
  const localHour = getLocalHour(slot.start, timezone)

  if (localHour >= 9 && localHour <= 17) return 'ideal'
  if (localHour >= 8 && localHour <= 20) return 'good'
  if (localHour >= 6 && localHour <= 22) return 'workable'
  return 'difficult'
}

function buildPrompt(
  participants: ParticipantWithAvailability[],
  candidates: { slot: TimeSlot; score: number; availableCount: number }[],
  slotDuration: number
): string {
  const participantInfo = participants
    .map(p => `- ${p.name} (${p.timezone}): ${p.availability.length} available slots`)
    .join('\n')

  const candidateInfo = candidates
    .map((c, i) => {
      const localTimes = participants
        .map(p => {
          const formatted = formatSlotInTimezone(c.slot, p.timezone)
          return `  ${p.name}: ${formatted.startTime} - ${formatted.endTime}`
        })
        .join('\n')

      return `Candidate ${i}:
UTC Time: ${format(c.slot.start, 'yyyy-MM-dd HH:mm')}
Available: ${c.availableCount}/${participants.length} participants
Local times:
${localTimes}`
    })
    .join('\n\n')

  return `Please analyze these potential meeting times and suggest the best one.

Participants:
${participantInfo}

Meeting duration: ${slotDuration} minutes

Top candidates:
${candidateInfo}

Please select the best candidate and explain your reasoning.`
}
