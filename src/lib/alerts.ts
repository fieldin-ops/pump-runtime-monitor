import { FIRST_DAY, PUMP_SITES, TIMEZONE } from './constants'
import { fetchDeviceMessages } from './flespi'
import type { FlespiMessage } from './flespi'
import type { PumpSiteConfig } from './constants'
import type { PumpSummary } from './pumpSummary'
import {
  dayBounds,
  formatDuration,
  processTwoDayMessages,
} from './pumpLogic'

export const MIN_RUNTIME_HOURS = 15

export interface PumpAlert {
  id: string
  siteId: string
  date: string
  type: 'interrupted' | 'short-runtime'
  details: string
  runtime: number
  breaks?: number
}

export function alertTypeLabel(type: PumpAlert['type']): string {
  return type === 'interrupted' ? 'Interrupted' : 'Short Runtime'
}

function iterateDays(fromDateStr: string, through: Date): Date[] {
  const days: Date[] = []
  let current = new Date(`${fromDateStr}T12:00:00`)
  const throughStr = through.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const end = new Date(`${throughStr}T12:00:00`)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function dateToString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

export function generateAlerts(
  messages: FlespiMessage[],
  siteId: string,
): PumpAlert[] {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const today = new Date(`${todayStr}T12:00:00`)
  const days = iterateDays(FIRST_DAY, today)
  const alerts: PumpAlert[] = []

  for (const date of days) {
    const dateStr = dateToString(date)
    const { start: dayStart } = dayBounds(date)
    const windowStart = dayStart - 86400
    const windowEnd = dayStart + 86400
    const windowMessages = messages.filter(
      (m) => m.timestamp >= windowStart && m.timestamp <= windowEnd,
    )

    const processed = processTwoDayMessages(windowMessages, date)
    const runtime = processed.stats.totalRuntimeHours
    if (runtime <= 0) continue

    const onSegments = processed.segments.filter((s) => s.running)
    const breaks = onSegments.length - 1

    if (onSegments.length > 1) {
      alerts.push({
        id: `${siteId}-${dateStr}-interrupted`,
        siteId,
        date: dateStr,
        type: 'interrupted',
        details: `${breaks} break${breaks !== 1 ? 's' : ''}, total runtime ${formatDuration(runtime)}`,
        runtime,
        breaks,
      })
    }

    if (runtime < MIN_RUNTIME_HOURS) {
      alerts.push({
        id: `${siteId}-${dateStr}-short-runtime`,
        siteId,
        date: dateStr,
        type: 'short-runtime',
        details: `Runtime: ${runtime.toFixed(1)} hrs (below ${MIN_RUNTIME_HOURS} hrs)`,
        runtime,
      })
    }
  }

  return alerts.sort((a, b) => b.date.localeCompare(a.date))
}

export async function fetchPumpAlerts(pump: PumpSiteConfig): Promise<PumpAlert[]> {
  const firstDayStart = dayBounds(new Date(`${FIRST_DAY}T12:00:00`)).start - 86400
  const now = Math.floor(Date.now() / 1000)
  const messages = await fetchDeviceMessages(pump.flespiDeviceId, firstDayStart, now)
  return generateAlerts(messages, pump.siteId)
}

export async function fetchAllPumpAlerts(pumps: PumpSiteConfig[]): Promise<PumpAlert[]> {
  const results = await Promise.all(pumps.map(fetchPumpAlerts))
  return results.flat().sort((a, b) => b.date.localeCompare(a.date))
}

export interface FleetAlert {
  id: string
  siteName: string
  siteId: string
  message: string
  type: 'communication' | 'error' | 'interrupted' | 'short-runtime'
  date?: string
}

export function buildFleetAlerts(
  summaries: PumpSummary[],
  runtimeAlerts: PumpAlert[],
): FleetAlert[] {
  const items: FleetAlert[] = []

  for (const s of summaries) {
    if (s.error) {
      items.push({
        id: `${s.pump.siteId}-error`,
        siteName: s.pump.name,
        siteId: s.pump.siteId,
        message: s.error,
        type: 'error',
      })
    } else if (!s.communicating) {
      const message =
        s.running === true
          ? 'No transmission in the last 30 minutes'
          : 'No transmission in the last 13 hours'
      items.push({
        id: `${s.pump.siteId}-comm`,
        siteName: s.pump.name,
        siteId: s.pump.siteId,
        message,
        type: 'communication',
      })
    }
  }

  for (const alert of runtimeAlerts) {
    const site = PUMP_SITES.find((p) => p.siteId === alert.siteId)
    items.push({
      id: alert.id,
      siteName: site?.name ?? alert.siteId,
      siteId: alert.siteId,
      message: alert.details,
      type: alert.type,
      date: alert.date,
    })
  }

  return items
}

export function sortAlertsForDisplay<T extends { id: string; date?: string }>(
  alerts: T[],
  readIds: Set<string>,
): T[] {
  return [...alerts].sort((a, b) => {
    const aRead = readIds.has(a.id)
    const bRead = readIds.has(b.id)
    if (aRead !== bRead) return aRead ? 1 : -1
    const aDate = a.date ?? ''
    const bDate = b.date ?? ''
    return bDate.localeCompare(aDate)
  })
}
