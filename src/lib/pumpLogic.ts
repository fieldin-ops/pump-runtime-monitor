import {
  endOfDay,
  format,
  startOfDay,
} from 'date-fns'
import {
  NOISE_FLIP_THRESHOLD,
  NOISE_WINDOW_SECONDS,
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
}

export function dayBounds(date: Date): { start: number; end: number } {
  return {
    start: Math.floor(startOfDay(date).getTime() / 1000),
    end: Math.floor(endOfDay(date).getTime() / 1000),
  }
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

export function computeStats(segments: TimelineSegment[]): DayStats {
  let totalRuntime = 0
  let longestRun = 0
  let startCount = 0
  let stopCount = 0

  for (const seg of segments) {
    const duration = seg.end - seg.start
    if (seg.running) {
      totalRuntime += duration
      longestRun = Math.max(longestRun, duration)
    }
  }

  for (let i = 1; i < segments.length; i++) {
    if (segments[i].running && !segments[i - 1].running) startCount++
    if (!segments[i].running && segments[i - 1].running) stopCount++
  }

  if (segments.length > 0 && segments[0].running) startCount++

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

  return {
    segments,
    events,
    stats: computeStats(segments),
    lastPosition: getLastPosition(dayMessages),
    messageCount: dayMessages.length,
  }
}

export function formatTimestamp(ts: number): string {
  return format(new Date(ts * 1000), 'HH:mm:ss')
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours.toFixed(1)} hrs`
}

export function segmentPercent(
  segment: TimelineSegment,
  dayStart: number,
  dayEnd: number,
): { left: number; width: number } {
  const total = dayEnd - dayStart
  const left = ((segment.start - dayStart) / total) * 100
  const width = ((segment.end - segment.start) / total) * 100
  return { left, width }
}
