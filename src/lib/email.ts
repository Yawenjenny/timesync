import nodemailer from 'nodemailer'
import { OverlapResult, AISuggestion, MeetingType } from '@/types'
import { formatSlotInTimezone, getTopOverlappingSlots } from './overlap'

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

interface Participant {
  name: string
  email: string
  timezone: string
}

export async function sendResultsEmail(
  participants: Participant[],
  overlapResult: OverlapResult,
  aiSuggestion: AISuggestion | null,
  meetingType: MeetingType = 'ONE_TIME'
): Promise<void> {
  const fromEmail = process.env.GMAIL_USER || 'noreply@timesync.app'
  const isRecurring = meetingType === 'RECURRING'

  // Send personalized email to each participant
  for (const participant of participants) {
    const emailContent = buildEmailContent(
      participant,
      participants,
      overlapResult,
      aiSuggestion,
      isRecurring
    )

    try {
      await transporter.sendMail({
        from: `TimeSync <${fromEmail}>`,
        to: participant.email,
        subject: overlapResult.hasOverlap
          ? 'Meeting Time Found - TimeSync'
          : 'Meeting Time Suggestion - TimeSync',
        html: emailContent,
      })
    } catch (error) {
      console.error(`Failed to send email to ${participant.email}:`, error)
    }
  }
}

function buildEmailContent(
  recipient: Participant,
  allParticipants: Participant[],
  overlapResult: OverlapResult,
  aiSuggestion: AISuggestion | null,
  isRecurring: boolean = false
): string {
  const participantNames = allParticipants.map(p => p.name).join(', ')
  const meetingTypeLabel = isRecurring ? 'Recurring Meeting' : 'Meeting'

  if (overlapResult.hasOverlap) {
    const topSlots = getTopOverlappingSlots(overlapResult.overlappingSlots, 3)
    const slotsHtml = topSlots
      .map(slot => {
        const formatted = formatSlotInTimezone(slot, recipient.timezone, isRecurring)
        return `<li style="margin-bottom: 8px;"><strong>${formatted.date}</strong><br/>${formatted.startTime} - ${formatted.endTime}</li>`
      })
      .join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">${meetingTypeLabel} Time Found!</h1>

        <p>Hi ${recipient.name},</p>

        <p>Great news! Your group found common availability${isRecurring ? ' for your recurring meeting' : ''}.</p>

        <h2 style="color: #1e40af;">Best Times (in your time zone)</h2>
        <ul style="list-style: none; padding: 0;">
          ${slotsHtml}
        </ul>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Participants:</strong> ${participantNames}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="color: #9ca3af; font-size: 12px;">
          This email was sent by TimeSync - Cross-Timezone Meeting Scheduler
        </p>
      </body>
      </html>
    `
  }

  // No overlap - include AI suggestion
  if (aiSuggestion) {
    const suggestedTime = formatSlotInTimezone(aiSuggestion.suggestedTime, recipient.timezone, isRecurring)

    const impactHtml = aiSuggestion.participantImpact
      .map(impact => {
        const color =
          impact.inconvenienceLevel === 'ideal' ? '#22c55e' :
          impact.inconvenienceLevel === 'good' ? '#84cc16' :
          impact.inconvenienceLevel === 'workable' ? '#eab308' :
          '#ef4444'
        return `<li style="margin-bottom: 4px;"><strong>${impact.name}</strong>: ${impact.localTime} <span style="color: ${color};">(${impact.inconvenienceLevel})</span></li>`
      })
      .join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">No Perfect Overlap Found</h1>

        <p>Hi ${recipient.name},</p>

        <p>Unfortunately, there's no time when everyone is available. However, our AI has suggested a compromise time.</p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #92400e;">AI Recommended Time</h2>
          <p style="font-size: 18px; margin-bottom: 8px;">
            <strong>${suggestedTime.date}</strong><br/>
            ${suggestedTime.startTime} - ${suggestedTime.endTime} (your time)
          </p>
          <p style="color: #78350f; margin-bottom: 0;">${aiSuggestion.reasoning}</p>
        </div>

        <h3>Impact for Each Participant:</h3>
        <ul style="list-style: none; padding: 0;">
          ${impactHtml}
        </ul>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Participants:</strong> ${participantNames}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="color: #9ca3af; font-size: 12px;">
          This email was sent by TimeSync - Cross-Timezone Meeting Scheduler
        </p>
      </body>
      </html>
    `
  }

  // No overlap and no AI suggestion
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #ef4444;">No Common Availability Found</h1>

      <p>Hi ${recipient.name},</p>

      <p>Unfortunately, there's no time when everyone is available. You may need to coordinate directly to find a workable time.</p>

      <p style="color: #6b7280; font-size: 14px;">
        <strong>Participants:</strong> ${participantNames}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This email was sent by TimeSync - Cross-Timezone Meeting Scheduler
      </p>
    </body>
    </html>
  `
}
