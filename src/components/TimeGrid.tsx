'use client'

import { useState, useCallback, useMemo } from 'react'
import { format, addDays, startOfDay, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { cn } from '@/lib/utils'
import { TimeSlot, ParticipantWithAvailability } from '@/types'

interface TimeGridProps {
  startDate: Date
  endDate: Date
  slotDuration: 15 | 30 | 60
  timezone: string
  selectedSlots: TimeSlot[]
  onSlotsChange: (slots: TimeSlot[]) => void
  existingParticipants?: ParticipantWithAvailability[]
  readonly?: boolean
}

export function TimeGrid({
  startDate,
  endDate,
  slotDuration,
  timezone,
  selectedSlots,
  onSlotsChange,
  existingParticipants = [],
  readonly = false,
}: TimeGridProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')

  // Generate days between start and end
  const days = useMemo(() => {
    const result: Date[] = []
    let current = startOfDay(startDate)
    const end = startOfDay(endDate)
    while (current <= end) {
      result.push(current)
      current = addDays(current, 1)
    }
    return result
  }, [startDate, endDate])

  // Generate time slots for a day (8 AM to 10 PM)
  const slotsPerDay = useMemo(() => {
    const slots: { hour: number; minute: number }[] = []
    for (let hour = 8; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        slots.push({ hour, minute })
      }
    }
    return slots
  }, [slotDuration])

  // Check if a slot is selected
  const isSlotSelected = useCallback(
    (day: Date, slotIndex: number) => {
      const localSlotStart = setMinutes(setHours(day, slotsPerDay[slotIndex].hour), slotsPerDay[slotIndex].minute)
      const slotStartUTC = fromZonedTime(localSlotStart, timezone)
      return selectedSlots.some(
        slot => slot.start.getTime() === slotStartUTC.getTime()
      )
    },
    [selectedSlots, slotsPerDay, timezone]
  )

  // Get availability count for a slot
  const getSlotAvailabilityCount = useCallback(
    (day: Date, slotIndex: number) => {
      if (existingParticipants.length === 0) return 0

      // Create local time slot and convert to UTC for comparison
      const localSlotStart = setMinutes(setHours(day, slotsPerDay[slotIndex].hour), slotsPerDay[slotIndex].minute)
      // Convert the local time (in user's timezone) to UTC
      const slotStartUTC = fromZonedTime(localSlotStart, timezone)

      return existingParticipants.filter(participant =>
        participant.availability.some(avail => {
          // These are already in UTC from the database
          const availStart = new Date(avail.start)
          const availEnd = new Date(avail.end)
          return slotStartUTC >= availStart && slotStartUTC < availEnd
        })
      ).length
    },
    [existingParticipants, slotsPerDay, timezone]
  )

  // Toggle slot selection
  const toggleSlot = useCallback(
    (day: Date, slotIndex: number, forceSelect?: boolean) => {
      if (readonly) return

      // Create local time and convert to UTC for storage
      const localSlotStart = setMinutes(setHours(day, slotsPerDay[slotIndex].hour), slotsPerDay[slotIndex].minute)
      const slotStartUTC = fromZonedTime(localSlotStart, timezone)
      const slotEndUTC = new Date(slotStartUTC.getTime() + slotDuration * 60 * 1000)

      const existingIndex = selectedSlots.findIndex(
        slot => slot.start.getTime() === slotStartUTC.getTime()
      )

      if (forceSelect === true) {
        if (existingIndex === -1) {
          onSlotsChange([...selectedSlots, { start: slotStartUTC, end: slotEndUTC }])
        }
      } else if (forceSelect === false) {
        if (existingIndex !== -1) {
          onSlotsChange(selectedSlots.filter((_, i) => i !== existingIndex))
        }
      } else {
        if (existingIndex !== -1) {
          onSlotsChange(selectedSlots.filter((_, i) => i !== existingIndex))
        } else {
          onSlotsChange([...selectedSlots, { start: slotStartUTC, end: slotEndUTC }])
        }
      }
    },
    [selectedSlots, onSlotsChange, slotDuration, slotsPerDay, readonly, timezone]
  )

  // Mouse handlers for drag selection
  const handleMouseDown = (dayIndex: number, slotIndex: number) => {
    if (readonly) return
    setIsDragging(true)
    const isCurrentlySelected = isSlotSelected(days[dayIndex], slotIndex)
    setDragMode(isCurrentlySelected ? 'deselect' : 'select')
    toggleSlot(days[dayIndex], slotIndex)
  }

  const handleMouseEnter = (dayIndex: number, slotIndex: number) => {
    if (!isDragging || readonly) return
    toggleSlot(days[dayIndex], slotIndex, dragMode === 'select')
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Get heat color based on availability count
  const getHeatColor = (count: number, total: number) => {
    if (count === 0 || total === 0) return ''
    const ratio = count / total
    if (ratio === 1) return 'bg-green-200'
    if (ratio >= 0.75) return 'bg-green-100'
    if (ratio >= 0.5) return 'bg-yellow-100'
    if (ratio >= 0.25) return 'bg-orange-100'
    return 'bg-red-50'
  }

  return (
    <div
      className="overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="inline-block min-w-full">
        {/* Header row with days */}
        <div className="flex">
          <div className="w-16 shrink-0" /> {/* Empty corner */}
          {days.map((day, i) => (
            <div
              key={i}
              className="w-20 shrink-0 text-center p-2 border-b font-medium text-sm"
            >
              <div>{format(day, 'EEE')}</div>
              <div className="text-muted-foreground">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 shrink-0">
            {slotsPerDay.map((slot, i) => (
              <div
                key={i}
                className="h-6 text-xs text-muted-foreground text-right pr-2 flex items-center justify-end"
              >
                {slot.minute === 0 && format(setHours(new Date(), slot.hour), 'h a')}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="w-20 shrink-0">
              {slotsPerDay.map((_, slotIndex) => {
                const isSelected = isSlotSelected(day, slotIndex)
                const availabilityCount = getSlotAvailabilityCount(day, slotIndex)
                const heatColor = existingParticipants.length > 0
                  ? getHeatColor(availabilityCount, existingParticipants.length)
                  : ''

                return (
                  <div
                    key={slotIndex}
                    className={cn(
                      'h-6 border border-border/50 cursor-pointer transition-colors',
                      heatColor,
                      isSelected && 'bg-primary/80 border-primary',
                      !readonly && 'hover:bg-primary/30',
                      readonly && 'cursor-default'
                    )}
                    onMouseDown={() => handleMouseDown(dayIndex, slotIndex)}
                    onMouseEnter={() => handleMouseEnter(dayIndex, slotIndex)}
                    title={
                      existingParticipants.length > 0
                        ? `${availabilityCount}/${existingParticipants.length} available`
                        : undefined
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {existingParticipants.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Availability:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-50 border" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 border" />
            <span>All</span>
          </div>
        </div>
      )}
    </div>
  )
}
