export const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Hawaii' },
  { value: 'America/Anchorage', label: '(UTC-09:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'America/New_York', label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) Brasilia' },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores' },
  { value: 'Europe/London', label: '(UTC+00:00) London, Dublin, Lisbon' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris, Berlin, Rome, Madrid' },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki, Athens, Cairo' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow, Istanbul' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai, Abu Dhabi' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi, Islamabad' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Mumbai, New Delhi' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka' },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok, Jakarta' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Beijing, Shanghai, Singapore' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo, Seoul' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, Wellington' },
]

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
}

export function getTimezoneLabel(timezone: string): string {
  const found = TIMEZONES.find(tz => tz.value === timezone)
  return found?.label || timezone
}
