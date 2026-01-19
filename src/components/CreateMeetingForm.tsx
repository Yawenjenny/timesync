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
import { TIMEZONES, detectUserTimezone } from '@/lib/timezones'
import { TimeSlot } from '@/types'
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
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: addDays(new Date(), 6),
  })
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])

  // Auto-detect timezone on mount
  useEffect(() => {
    const detected = detectUserTimezone()
    // Find closest match in our timezone list
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
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerName: name,
          organizerEmail: email,
          organizerTimezone: timezone,
          expectedParticipants: parseInt(participantCount),
          dateRangeStart: dateRange.from.toISOString(),
          dateRangeEnd: dateRange.to.toISOString(),
          slotDuration: parseInt(slotDuration),
          availability: selectedSlots.map(slot => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
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

          <div className="space-y-2">
            <Label>Date Range</Label>
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
                        setSelectedSlots([]) // Clear slots when date range changes
                      }
                    }}
                    numberOfMonths={2}
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Availability</CardTitle>
          <CardDescription>
            Click and drag to select time slots when you are available.
            Times are shown in your local timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeGrid
            startDate={dateRange.from}
            endDate={dateRange.to}
            slotDuration={parseInt(slotDuration) as 15 | 30 | 60}
            timezone={timezone}
            selectedSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
          />
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
