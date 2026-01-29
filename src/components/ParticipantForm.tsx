'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { TimeGrid } from '@/components/TimeGrid'
import WeeklyTimeGrid from '@/components/WeeklyTimeGrid'
import { TIMEZONES, detectUserTimezone } from '@/lib/timezones'
import { TimeSlot, ParticipantWithAvailability, MeetingType } from '@/types'

interface ParticipantFormProps {
  meetingId: string
  organizerName: string
  dateRangeStart: Date
  dateRangeEnd: Date
  slotDuration: 15 | 30 | 60
  expectedParticipants: number
  currentParticipants: number
  existingParticipants: ParticipantWithAvailability[]
  meetingType: MeetingType
  selectedDates?: Date[] // For one-time meetings
}

export function ParticipantForm({
  meetingId,
  organizerName,
  dateRangeStart,
  dateRangeEnd,
  slotDuration,
  expectedParticipants,
  currentParticipants,
  existingParticipants,
  meetingType,
  selectedDates,
}: ParticipantFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])

  // Auto-detect timezone on mount
  useEffect(() => {
    const detected = detectUserTimezone()
    const match = TIMEZONES.find(tz => tz.value === detected)
    setTimezone(match?.value || 'America/New_York')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedSlots.length === 0) {
      setError('Please select at least one available time slot')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/meetings/${meetingId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          timezone,
          availability: selectedSlots.map(slot => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            ...(meetingType === 'RECURRING' && slot.dayOfWeek !== undefined ? { dayOfWeek: slot.dayOfWeek } : {}),
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit availability')
      }

      const data = await response.json()
      setSubmitted(true)
      setIsComplete(data.isComplete)

      // Refresh the page to show updated state
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="text-6xl mb-4">
            {isComplete ? '🎉' : '✅'}
          </div>
          <CardTitle className="text-2xl">
            {isComplete ? 'All Done!' : 'Availability Submitted!'}
          </CardTitle>
          <CardDescription>
            {isComplete
              ? 'Everyone has responded! Check your email for the meeting results.'
              : `Waiting for ${expectedParticipants - currentParticipants - 1} more participant(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You&apos;ll receive an email with the results once all participants have submitted their availability.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Meeting Info */}
      <Card>
        <CardHeader>
          <CardTitle>Join Meeting</CardTitle>
          <CardDescription>
            {organizerName} is looking for a time that works for everyone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {currentParticipants}/{expectedParticipants} responded
            </Badge>
            <Badge variant="outline">{slotDuration} min slots</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
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
                placeholder="jane@example.com"
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

      {/* Participants who have already responded */}
      {existingParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Who&apos;s Responded</CardTitle>
            <CardDescription>
              The colored cells show when others are available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {existingParticipants.map(p => (
                <Badge key={p.id} variant="secondary">
                  {p.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Availability</CardTitle>
          <CardDescription>
            Click and drag to select time slots when you are available.
            Times are shown in your local timezone.
            {meetingType === 'RECURRING' && (
              <span className="block mt-1">
                Select your weekly recurring availability (these times will repeat each week).
              </span>
            )}
            {existingParticipants.length > 0 && (
              <span className="block mt-1">
                Darker colors indicate more people are available at that time.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetingType === 'RECURRING' ? (
            <WeeklyTimeGrid
              slotDuration={slotDuration}
              timezone={timezone}
              selectedSlots={selectedSlots}
              onSlotsChange={setSelectedSlots}
              existingParticipants={existingParticipants}
            />
          ) : (
            <TimeGrid
              startDate={new Date(dateRangeStart)}
              endDate={new Date(dateRangeEnd)}
              slotDuration={slotDuration}
              timezone={timezone}
              selectedSlots={selectedSlots}
              onSlotsChange={setSelectedSlots}
              existingParticipants={existingParticipants}
              selectedDatesOnly={selectedDates}
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
        {isLoading ? 'Submitting...' : 'Submit My Availability'}
      </Button>
    </form>
  )
}
