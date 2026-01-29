'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimeGrid } from '@/components/TimeGrid'
import WeeklyTimeGrid from '@/components/WeeklyTimeGrid'
import { TIMEZONES, detectUserTimezone } from '@/lib/timezones'
import { TimeSlot, MeetingType } from '@/types'
import { cn } from '@/lib/utils'

export function CreateMeetingForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('')
  const [participantCount, setParticipantCount] = useState('3')
  const [slotDuration, setSlotDuration] = useState<'15' | '30' | '60'>('30')
  const [meetingType, setMeetingType] = useState<MeetingType>('ONE_TIME')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: addDays(new Date(), 6),
  })
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])

  // Auto-detect timezone on mount
  useEffect(() => {
    const detected = detectUserTimezone()
    // Find closest match in our timezone list
    const match = TIMEZONES.find(tz => tz.value === detected)
    setTimezone(match?.value || 'America/New_York')
  }, [])

  // Clear selections when meeting type changes
  useEffect(() => {
    setSelectedSlots([])
    setSelectedDates([])
  }, [meetingType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedSlots.length === 0) {
      setError('Please select at least one available time slot')
      return
    }

    if (meetingType === 'ONE_TIME' && selectedDates.length === 0) {
      setError('Please select at least one date')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerName: name,
          organizerEmail: email,
          organizerTimezone: timezone,
          expectedParticipants: parseInt(participantCount),
          meetingType,
          dateRangeStart: dateRange.from.toISOString(),
          dateRangeEnd: dateRange.to.toISOString(),
          selectedDates: meetingType === 'ONE_TIME' ? selectedDates.map(d => d.toISOString()) : [],
          slotDuration: parseInt(slotDuration),
          availability: selectedSlots.map(slot => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            dayOfWeek: slot.dayOfWeek,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create meeting')
      }

      const data = await response.json()
      router.push(`/meeting/${data.id}/created`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
          <CardDescription>
            Enter your details so participants know who created this meeting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Your Time Zone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Settings</CardTitle>
          <CardDescription>
            Configure how your meeting poll will work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meeting Type Selection */}
          <div className="space-y-2">
            <Label>Meeting Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={meetingType === 'ONE_TIME' ? 'default' : 'outline'}
                onClick={() => setMeetingType('ONE_TIME')}
                className="flex-1"
              >
                One-Time Meeting
              </Button>
              <Button
                type="button"
                variant={meetingType === 'RECURRING' ? 'default' : 'outline'}
                onClick={() => setMeetingType('RECURRING')}
                className="flex-1"
              >
                Recurring Meeting
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {meetingType === 'ONE_TIME'
                ? 'Select specific dates for a one-time meeting'
                : 'Select weekly availability for recurring meetings'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="participants">Number of Participants</Label>
              <Select value={participantCount} onValueChange={setParticipantCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 19 }, (_, i) => i + 2).map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Including yourself
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Time Slot Duration</Label>
              <Select value={slotDuration} onValueChange={(v) => setSlotDuration(v as '15' | '30' | '60')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Selection - Different UI based on meeting type */}
          {meetingType === 'ONE_TIME' ? (
            <div className="space-y-2">
              <Label>Select Dates</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Click on the dates you want to consider for the meeting
              </p>
              <div className="border rounded-lg p-4">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => {
                    setSelectedDates(dates || [])
                    setSelectedSlots([]) // Clear slots when dates change
                  }}
                  numberOfMonths={2}
                  disabled={{ before: new Date() }}
                  className="mx-auto"
                />
              </div>
              {selectedDates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Date Range</Label>
              <p className="text-xs text-muted-foreground mb-2">
                The period during which the recurring meeting will take place
              </p>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                        }
                      }}
                      numberOfMonths={2}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Availability</CardTitle>
          <CardDescription>
            {meetingType === 'ONE_TIME'
              ? 'Click and drag to select time slots on the selected dates.'
              : 'Click and drag to select your weekly availability.'}
            {' '}Times are shown in your local timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetingType === 'ONE_TIME' ? (
            selectedDates.length > 0 ? (
              <TimeGrid
                startDate={selectedDates[0]}
                endDate={selectedDates[selectedDates.length - 1]}
                slotDuration={parseInt(slotDuration) as 15 | 30 | 60}
                timezone={timezone}
                selectedSlots={selectedSlots}
                onSlotsChange={setSelectedSlots}
                selectedDatesOnly={selectedDates}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Please select at least one date above to show available time slots
              </div>
            )
          ) : (
            <WeeklyTimeGrid
              slotDuration={parseInt(slotDuration) as 15 | 30 | 60}
              timezone={timezone}
              selectedSlots={selectedSlots}
              onSlotsChange={setSelectedSlots}
            />
          )}
          {selectedSlots.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating Meeting...' : 'Create Meeting & Get Link'}
      </Button>
    </form>
  )
}
