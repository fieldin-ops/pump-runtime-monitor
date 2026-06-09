import {
  COMMUNICATION_TIMEOUT_SECONDS,
  type PumpSiteConfig,
} from './constants'
import { fetchDeviceMessages } from './flespi'
import {
  celsiusToFahrenheit,
  dayBounds,
  formatDuration,
  processTwoDayMessages,
  type TimelineSegment,
} from './pumpLogic'
import { TIMEZONE } from './constants'
import type { FlespiMessage } from './flespi'

export interface PumpSummary {
  pump: PumpSiteConfig
  running: boolean | null
  lastRunCycleHours: number | null
  lastRunCycleOngoing: boolean
  lastTransmissionTimestamp: number | null
  latestTemperatureF: number | null
  communicating: boolean
  error: string | null
}

function getLastRunCycle(
  segments: TimelineSegment[],
  now: number,
): { hours: number; ongoing: boolean } | null {
  const runningSegments = segments.filter((s) => s.running)
  if (runningSegments.length === 0) return null

  const last = runningSegments[runningSegments.length - 1]
  const ongoing = last.end >= now - 120
  const effectiveEnd = ongoing ? now : last.end
  const hours = (effectiveEnd - last.start) / 3600

  return { hours, ongoing }
}

export function processPumpSummary(
  pump: PumpSiteConfig,
  messages: FlespiMessage[],
): Omit<PumpSummary, 'error'> {
  const now = Math.floor(Date.now() / 1000)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const today = new Date(`${todayStr}T12:00:00`)

  const processed = processTwoDayMessages(messages, today)
  const running =
    processed.timelineSegments.length > 0
      ? processed.timelineSegments[processed.timelineSegments.length - 1].running
      : null

  const lastRun = getLastRunCycle(processed.timelineSegments, now)

  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp)
  const lastTransmissionTimestamp =
    sorted.length > 0 ? sorted[0].timestamp : null

  const latestTempMsg = sorted.find((m) => m['device.temperature'] !== undefined)
  const latestTemperatureF =
    latestTempMsg?.['device.temperature'] !== undefined
      ? celsiusToFahrenheit(latestTempMsg['device.temperature']!)
      : null

  const communicating =
    lastTransmissionTimestamp !== null &&
    now - lastTransmissionTimestamp <= COMMUNICATION_TIMEOUT_SECONDS

  return {
    pump,
    running,
    lastRunCycleHours: lastRun?.hours ?? null,
    lastRunCycleOngoing: lastRun?.ongoing ?? false,
    lastTransmissionTimestamp,
    latestTemperatureF,
    communicating,
  }
}

export async function fetchPumpSummary(pump: PumpSiteConfig): Promise<PumpSummary> {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
    const today = new Date(`${todayStr}T12:00:00`)
    const { start, end } = dayBounds(today)
    const from = start - 86400
    const messages = await fetchDeviceMessages(pump.flespiDeviceId, from, end)
    return { ...processPumpSummary(pump, messages), error: null }
  } catch (err) {
    return {
      pump,
      running: null,
      lastRunCycleHours: null,
      lastRunCycleOngoing: false,
      lastTransmissionTimestamp: null,
      latestTemperatureF: null,
      communicating: false,
      error: err instanceof Error ? err.message : 'Failed to load data',
    }
  }
}

export async function fetchAllPumpSummaries(
  pumps: PumpSiteConfig[],
): Promise<PumpSummary[]> {
  return Promise.all(pumps.map(fetchPumpSummary))
}

export function formatLastTransmission(ts: number | null): string {
  if (ts === null) return 'No data'
  return new Date(ts * 1000).toLocaleString('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatLastRunCycle(
  hours: number | null,
  ongoing: boolean,
): string {
  if (hours === null) return '—'
  const label = formatDuration(hours)
  return ongoing ? `${label} (running)` : label
}
