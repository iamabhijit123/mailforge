export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'

function localToUTC(dateStr: string, timeStr: string, ianaTimezone: string): string {
  const dtStr = `${dateStr}T${timeStr}:00`
  const guess = new Date(dtStr + 'Z')
  const guessInTz = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ianaTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(guess)
  const offset = guess.getTime() - new Date(guessInTz.replace(' ', 'T') + 'Z').getTime()
  return new Date(guess.getTime() + offset).toISOString()
}

function toNextWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  if (day === 6) d.setUTCDate(d.getUTCDate() + 2)  // Sat → Mon
  else if (day === 0) d.setUTCDate(d.getUTCDate() + 1)  // Sun → Mon
  return d.toISOString().slice(0, 10)
}

function advanceDate(dateStr: string, freq: Frequency): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (freq === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else if (freq === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (freq === 'biweekly') d.setUTCDate(d.getUTCDate() + 14)
  else if (freq === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export interface ScheduledSend {
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  scheduledAt: string  // UTC ISO
}

export function generateWeekdaySchedule(
  startDate: string,
  endDate: string,
  frequency: Frequency,
  sendTime: string,
  timezone: string,
): ScheduledSend[] {
  const sends: ScheduledSend[] = []
  let current = toNextWeekday(startDate)

  while (current <= endDate) {
    sends.push({
      date: current,
      time: sendTime,
      scheduledAt: localToUTC(current, sendTime, timezone),
    })
    current = toNextWeekday(advanceDate(current, frequency))
  }

  return sends
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
