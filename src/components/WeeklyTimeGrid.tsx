'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TimeSlot, ParticipantWithAvailability } from '@/types'

interface WeeklyTimeGridProps {
  slotDuration: 15 | 30 | 60
  timezone: string
  selectedSlots: TimeSlot[]
  onSlotsChange: (slots: TimeSlot[]) => void
  existingParticipants?: ParticipantWithAvailability[]
  readonly?: boolean
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function WeeklyTimeGrid({
  slotDuration,
  timezone,
  selectedSlots,
  onSlotsChange,
  existingParticipants = [],
  readonly = false,
}: WeeklyTimeGridProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')

  // Generate time slots for a day (9 AM to 9 PM)
  const slotsPerDay = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = []
    for (let hour = 9; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push({ hour, minute, label })
      }
    }
    return slots
  }, [slotDuration])

  // Check if a slot is selected (by day of week and time)
  const isSlotSelected = useCallback(
    (dayOfWeek: number, slotIndex: number) => {
      const { hour, minute } = slotsPerDay[slotIndex]
      return selectedSlots.some(
        slot => slot.dayOfWeek === dayOfWeek &&
                new Date(slot.start).getUTCHours() === hour &&
                new Date(slot.start).getUTCMinutes() === minute
      )
    },
    [selectedSlots, slotsPerDay]
  )

  // Get availability count for a slot
  const getSlotAvailabilityCount = useCallback(
    (dayOfWeek: number, slotIndex: number) => {
      if (existingParticipants.length === 0) return 0

      const { hour, minute } = slotsPerDay[slotIndex]

      return existingParticipants.filter(participant =>
        participant.availability.some(avail => {
          return avail.dayOfWeek === dayOfWeek &&
                 new Date(avail.start).getUTCHours() === hour &&
                 new Date(avail.start).getUTCMinutes() === minute
        })
      ).length
    },
    [existingParticipants, slotsPerDay]
  )

  // Toggle slot selection
  const toggleSlot = useCallback(
    (dayOfWeek: number, slotIndex: number, forceSelect?: boolean) => {
      if (readonly) return

      const { hour, minute } = slotsPerDay[slotIndex]

      // Create a reference date for the time using UTC (we use a fixed date since it's recurring)
      // Jan 2, 2000 is a Sunday (dayOfWeek 0)
      const slotStart = new Date(Date.UTC(2000, 0, 2 + dayOfWeek, hour, minute, 0, 0))
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000)

      const existingIndex = selectedSlots.findIndex(
        slot => slot.dayOfWeek === dayOfWeek &&
                new Date(slot.start).getUTCHours() === hour &&
                new Date(slot.start).getUTCMinutes() === minute
      )

      if (forceSelect === true) {
        if (existingIndex === -1) {
          onSlotsChange([...selectedSlots, { start: slotStart, end: slotEnd, dayOfWeek }])
        }
      } else if (forceSelect === false) {
        if (existingIndex !== -1) {
          onSlotsChange(selectedSlots.filter((_, i) => i !== existingIndex))
        }
      } else {
        if (existingIndex !== -1) {
          onSlotsChange(selectedSlots.filter((_, i) => i !== existingIndex))
        } else {
          onSlotsChange([...selectedSlots, { start: slotStart, end: slotEnd, dayOfWeek }])
        }
      }
    },
    [selectedSlots, onSlotsChange, slotDuration, slotsPerDay, readonly]
  )

  // Mouse handlers for drag selection
  const handleMouseDown = (dayOfWeek: number, slotIndex: number) => {
    if (readonly) return
    setIsDragging(true)
    const isCurrentlySelected = isSlotSelected(dayOfWeek, slotIndex)
    setDragMode(isCurrentlySelected ? 'deselect' : 'select')
    toggleSlot(dayOfWeek, slotIndex)
  }

  const handleMouseEnter = (dayOfWeek: number, slotIndex: number) => {
    if (!isDragging || readonly) return
    toggleSlot(dayOfWeek, slotIndex, dragMode === 'select')
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
    return 'bg-red-100'
  }

  return (
    <div
      className="select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="mb-2 text-sm text-gray-600">
        Times shown in {timezone}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-grid gap-px bg-gray-200 rounded-lg overflow-hidden"
             style={{ gridTemplateColumns: `60px repeat(7, minmax(60px, 1fr))` }}>
          {/* Header row */}
          <div className="bg-gray-100 p-2 text-xs font-medium text-gray-500">
            Time
          </div>
          {DAYS_OF_WEEK.map((day, index) => (
            <div key={day} className="bg-gray-100 p-2 text-center">
              <div className="font-medium text-sm">{day}</div>
            </div>
          ))}

          {/* Time slots */}
          {slotsPerDay.map((slot, slotIndex) => (
            <>
              <div key={`time-${slotIndex}`} className="bg-white p-1 text-xs text-gray-500 flex items-center justify-center">
                {slot.label}
              </div>
              {DAYS_OF_WEEK.map((_, dayIndex) => {
                const isSelected = isSlotSelected(dayIndex, slotIndex)
                const availabilityCount = getSlotAvailabilityCount(dayIndex, slotIndex)
                const heatColor = getHeatColor(availabilityCount, existingParticipants.length)

                return (
                  <div
                    key={`${dayIndex}-${slotIndex}`}
                    className={cn(
                      'bg-white p-1 min-h-[24px] cursor-pointer transition-colors',
                      heatColor,
                      isSelected && 'bg-blue-500 hover:bg-blue-600',
                      !isSelected && !readonly && 'hover:bg-gray-100',
                      readonly && 'cursor-default'
                    )}
                    onMouseDown={() => handleMouseDown(dayIndex, slotIndex)}
                    onMouseEnter={() => handleMouseEnter(dayIndex, slotIndex)}
                    title={`${DAYS_OF_WEEK_FULL[dayIndex]} ${slot.label}${availabilityCount > 0 ? ` - ${availabilityCount} available` : ''}`}
                  >
                    {availabilityCount > 0 && !isSelected && (
                      <span className="text-[10px] text-gray-600">{availabilityCount}</span>
                    )}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      {existingParticipants.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
          <span>Availability:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-100 border" />
            <span>Few</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border" />
            <span>Some</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border" />
            <span>Most</span>
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
