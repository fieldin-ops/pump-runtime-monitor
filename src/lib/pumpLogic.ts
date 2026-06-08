import {
  FIRST_DAY,
  NOISE_FLIP_THRESHOLD,
  NOISE_WINDOW_SECONDS,
  TIMEZONE,
} from './constants'
import type { FlespiMessage } from './flespi'

export interface StateChange {
  timestamp: number
  running: boolean
}

export interface TimelineSegment {
  start: number
  end: number
  running: boolean
}

export interface PumpEvent {
  type: 'start' | 'stop'
  timestamp: number
}

export interface DayStats {
  totalRuntimeHours: number
  startCount: number
  stopCount: number
  longestRunHours: number
}

export interface ProcessedDay {
  segments: TimelineSegment[]
  events: PumpEvent[]
  stats: DayStats
  lastPosition: { lat: number; lng: number } | null
  messageCount: number
  lastMessageTimestamp: number | null
}

export interface TwoDayBounds {
  windowStart: number
  windowEnd: number
  selectedDayStart: number
  selectedDayEnd: number
}

export interface ProcessedTwoDay extends ProcessedDay {
  timelineSegments: TimelineSegment[]
}

export function dayBounds(date: Date): { start: number; end: number } {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const startLocal = new Date(`${dateStr}T00:00:00`)
  const endLocal = new Date(`${dateStr}T23:59:59`)

  const offset = getTimezoneOffsetMs(startLocal)
  return {
    start: Math.floor((startLocal.getTime() + offset) / 1000),
    end: Math.floor((endLocal.getTime() + offset) / 1000),
  }
}

export function previousCalendarDay(date: Date): Date {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const [y, m, d] = dateStr.split('-').map(Number)
  const prev = new Date(y, m - 1, d)
  prev.setDate(prev.getDate() - 1)
  const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
  return new Date(`${prevStr}T12:00:00`)
}

export function twoDayBounds(date: Date): TwoDayBounds {
  const selected = dayBounds(date)
  const prev = dayBounds(previousCalendarDay(date))
  const firstDayStart = dayBounds(new Date(`${FIRST_DAY}T12:00:00`)).start
  return {
    windowStart: Math.max(prev.start, firstDayStart),
    windowEnd: selected.end,
    selectedDayStart: selected.start,
    selectedDayEnd: selected.end,
  }
}

export function isTodayInTimezone(date: Date): boolean {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  return nowStr === dateStr
}

function getTimezoneOffsetMs(date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: TIMEZONE })
  return new Date(utcStr).getTime() - new Date(tzStr).getTime()
}

function extractStateChanges(messages: FlespiMessage[]): StateChange[] {
  const sorted = [...messages]
    .filter((m) => m['engine.ignition.status'] !== undefined)
    .sort((a, b) => a.timestamp - b.timestamp)

  const changes: StateChange[] = []
  let lastStatus: boolean | undefined

  for (const msg of sorted) {
    const status = msg['engine.ignition.status']!
    if (status !== lastStatus) {
      changes.push({ timestamp: msg.timestamp, running: status })
      lastStatus = status
    }
  }

  return changes
}

/**
 * If ignition flips more than 3 times within 60 seconds, treat the cluster
 * as noise and keep the state from before the alternation began.
 */
export function filterNoise(changes: StateChange[]): StateChange[] {
  if (changes.length <= 1) return changes

  const noisy = new Set<number>()

  for (let i = 0; i < changes.length; i++) {
    let j = i
    while (
      j < changes.length &&
      changes[j].timestamp - changes[i].timestamp <= NOISE_WINDOW_SECONDS
    ) {
      j++
    }

    const flipsInWindow = j - i
    if (flipsInWindow > NOISE_FLIP_THRESHOLD) {
      for (let k = i; k < j; k++) noisy.add(k)
    }
  }

  if (noisy.size === 0) return changes

  const filtered: StateChange[] = []
  for (let i = 0; i < changes.length; i++) {
    if (noisy.has(i)) continue

    const prev = filtered[filtered.length - 1]
    if (!prev || prev.running !== changes[i].running) {
      filtered.push(changes[i])
    }
  }

  return filtered
}

export function buildSegments(
  changes: StateChange[],
  dayStart: number,
  dayEnd: number,
): TimelineSegment[] {
  if (changes.length === 0) {
    return [{ start: dayStart, end: dayEnd, running: false }]
  }

  const segments: TimelineSegment[] = []
  const first = changes[0]

  if (first.timestamp > dayStart) {
    segments.push({
      start: dayStart,
      end: first.timestamp,
      running: !first.running,
    })
  }

  for (let i = 0; i < changes.length; i++) {
    const start = changes[i].timestamp
    const end = i + 1 < changes.length ? changes[i + 1].timestamp : dayEnd
    segments.push({ start, end, running: changes[i].running })
  }

  return segments.filter((s) => s.end > s.start)
}

export function buildEvents(changes: StateChange[]): PumpEvent[] {
  return changes.map((c) => ({
    type: c.running ? 'start' : 'stop',
    timestamp: c.timestamp,
  }))
}

export function computeStats(segments: TimelineSegment[], events: PumpEvent[]): DayStats {
  let totalRuntime = 0
  let longestRun = 0

  for (const seg of segments) {
    const duration = seg.end - seg.start
    if (seg.running) {
      totalRuntime += duration
      longestRun = Math.max(longestRun, duration)
    }
  }

  const startCount = events.filter((e) => e.type === 'start').length
  const stopCount = events.filter((e) => e.type === 'stop').length

  return {
    totalRuntimeHours: totalRuntime / 3600,
    startCount,
    stopCount,
    longestRunHours: longestRun / 3600,
  }
}

export function getLastPosition(
  messages: FlespiMessage[],
): { lat: number; lng: number } | null {
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp)

  for (const msg of sorted) {
    const lat = msg['position.latitude']
    const lng = msg['position.longitude']
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng }
    }
  }

  return null
}

export function processDayMessages(
  messages: FlespiMessage[],
  date: Date,
): ProcessedDay {
  const { start, end } = dayBounds(date)
  const dayMessages = messages.filter(
    (m) => m.timestamp >= start && m.timestamp <= end,
  )

  const changes = filterNoise(extractStateChanges(dayMessages))
  const segments = buildSegments(changes, start, end)
  const events = buildEvents(changes)

  const sorted = [...dayMessages].sort((a, b) => b.timestamp - a.timestamp)
  return {
    segments,
    events,
    stats: computeStats(segments, events),
    lastPosition: getLastPosition(dayMessages),
    messageCount: dayMessages.length,
    lastMessageTimestamp: sorted.length > 0 ? sorted[0].timestamp : null,
  }
}

export function processTwoDayMessages(
  messages: FlespiMessage[],
  date: Date,
): ProcessedTwoDay {
  const { windowStart, windowEnd, selectedDayStart, selectedDayEnd } =
    twoDayBounds(date)

  const windowMessages = messages.filter(
    (m) => m.timestamp >= windowStart && m.timestamp <= windowEnd,
  )
  const dayMessages = windowMessages.filter(
    (m) => m.timestamp >= selectedDayStart && m.timestamp <= selectedDayEnd,
  )

  const windowChanges = filterNoise(extractStateChanges(windowMessages))
  const dayChanges = filterNoise(extractStateChanges(dayMessages))

  const timelineSegments = buildSegments(windowChanges, windowStart, windowEnd)
  const daySegments = buildSegments(dayChanges, selectedDayStart, selectedDayEnd)

  const dayEvents = buildEvents(dayChanges)
  const allSorted = [...windowMessages].sort((a, b) => b.timestamp - a.timestamp)
  return {
    segments: daySegments,
    timelineSegments,
    events: dayEvents,
    stats: computeStats(daySegments, dayEvents),
    lastPosition: getLastPosition(dayMessages),
    messageCount: dayMessages.length,
    lastMessageTimestamp: allSorted.length > 0 ? allSorted[0].timestamp : null,
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours.toFixed(1)} hrs`
}

export function segmentPercent(
  segment: TimelineSegment,
  windowStart: number,
  windowEnd: number,
): { left: number; width: number } {
  const total = windowEnd - windowStart
  const left = ((segment.start - windowStart) / total) * 100
  const width = ((segment.end - segment.start) / total) * 100
  return { left, width }
}

export function timestampPercent(
  ts: number,
  windowStart: number,
  windowEnd: number,
): number {
  const total = windowEnd - windowStart
  return ((ts - windowStart) / total) * 100
}
