'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function MeetingCreatedPage() {
  const params = useParams()
  const meetingId = params.id as string
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/meeting/${meetingId}`
    : `/meeting/${meetingId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">TimeSync</h1>
        </div>

        <Card className="text-center">
          <CardHeader>
            <div className="text-6xl mb-4">✅</div>
            <CardTitle className="text-2xl">Meeting Created!</CardTitle>
            <CardDescription>
              Share this link with your participants so they can add their availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-center font-mono text-sm"
              />
              <Button onClick={handleCopy} variant="outline">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                You&apos;ll receive an email with the results once all participants
                have submitted their availability.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">What happens next?</h3>
              <ol className="text-sm text-muted-foreground text-left space-y-2">
                <li>1. Share the link above with all meeting participants</li>
                <li>2. Each participant selects their available times</li>
                <li>3. Once everyone responds, you&apos;ll all receive an email with the overlapping times</li>
                <li>4. If there&apos;s no perfect overlap, AI will suggest the best compromise time</li>
              </ol>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(shareUrl, '_blank')}
            >
              Preview Meeting Page
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
