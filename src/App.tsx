import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  Gauge,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertSummaryBadge } from './components/AlertSummaryBadge'
import { DayPicker } from './components/DayPicker'
import { DayStats } from './components/DayStats'
import { EventList } from './components/EventList'
import { PumpMap } from './components/PumpMap'
import { Timeline } from './components/Timeline'
import {
  filterUnreadAlerts,
  useReadAlertIds,
} from './lib/alertStorage'
import {
  FIRST_DAY,
  FLESPI_TOKEN,
  FLESPI_TOKEN_PLACEHOLDER,
  TIMEZONE,
  getPumpSite,
} from './lib/constants'
import { fetchDeviceMessages, fetchLastTimestamp } from './lib/flespi'
import type { FlespiMessage } from './lib/flespi'
import { generateAlerts, type PumpAlert } from './lib/alerts'
import {
  dayBounds,
  processTwoDayMessages,
  type ProcessedTwoDay,
} from './lib/pumpLogic'

function parseDateFromParam(dateParam: string | null): Date | null {
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null
  return new Date(`${dateParam}T12:00:00`)
}

export default function App() {
  const { siteId } = useParams<{ siteId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const pump = siteId ? getPumpSite(siteId) : undefined

  const [selectedDate, setSelectedDate] = useState(() => {
    const fromUrl = parseDateFromParam(searchParams.get('date'))
    if (fromUrl) return fromUrl
    const nowInTz = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
    return new Date(`${nowInTz}T12:00:00`)
  })
  const [alerts, setAlerts] = useState<PumpAlert[]>([])
  const [processed, setProcessed] = useState<ProcessedTwoDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const allMessages = useRef<FlespiMessage[]>([])
  const lastCommTimestamp = useRef<number | null>(null)
  const readAlertIds = useReadAlertIds()

  const activeAlerts = useMemo(
    () => filterUnreadAlerts(alerts, readAlertIds),
    [alerts, readAlertIds],
  )

  const processForDate = useCallback((date: Date, messages: FlespiMessage[]) => {
    const { start: dayStart } = dayBounds(date)
    const windowStart = dayStart - 86400
    const windowEnd = dayStart + 86400
    const windowMessages = messages.filter(
      (m) => m.timestamp >= windowStart && m.timestamp <= windowEnd,
    )
    const result = processTwoDayMessages(windowMessages, date)
    if (lastCommTimestamp.current) {
      result.lastMessageTimestamp = lastCommTimestamp.current
    }
    return result
  }, [])

  const fetchAllData = useCallback(async () => {
    if (!pump) return

    if (FLESPI_TOKEN === FLESPI_TOKEN_PLACEHOLDER) {
      setError('Set your flespi token in src/lib/constants.ts (FLESPI_TOKEN).')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const firstDayStart = dayBounds(new Date(`${FIRST_DAY}T12:00:00`)).start - 86400
      const now = Math.floor(Date.now() / 1000)
      const messages = await fetchDeviceMessages(pump.flespiDeviceId, firstDayStart, now)
      allMessages.current = messages
      const lastTs = await fetchLastTimestamp(pump.flespiDeviceId)
      lastCommTimestamp.current = lastTs
      setProcessed(processForDate(selectedDate, messages))
      setAlerts(generateAlerts(messages, pump.siteId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [pump, selectedDate, processForDate])

  // Initial load and auto-refresh every 60s
  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 60_000)
    return () => clearInterval(interval)
  }, [pump])

  // When date changes, just re-process from cached messages (instant)
  useEffect(() => {
    if (allMessages.current.length > 0) {
      setProcessed(processForDate(selectedDate, allMessages.current))
    }
  }, [selectedDate, processForDate])

  useEffect(() => {
    const fromUrl = parseDateFromParam(searchParams.get('date'))
    if (fromUrl) {
      setSelectedDate(fromUrl)
    }
  }, [searchParams])

  const handleDateChange = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      const dateStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
      setSearchParams({ date: dateStr }, { replace: true })
    },
    [setSearchParams],
  )

  if (!siteId || !pump) {
    return <Navigate to="/" replace />
  }

  const { start: selectedDayStart, end: selectedDayEnd } = dayBounds(selectedDate)
  const currentStatus = processed?.timelineSegments.length
    ? processed.timelineSegments[processed.timelineSegments.length - 1].running
    : null

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
                aria-label="Back to fleet overview"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Gauge className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {pump.name}
                </h1>
                <p className="text-sm text-slate-400">
                  Pump Site &nbsp;·&nbsp; Device ID: {pump.deviceId}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AlertSummaryBadge
                count={activeAlerts.length}
                to={`/pump/${pump.siteId}/alerts`}
              />
              <DayPicker
                selectedDate={selectedDate}
                onChange={handleDateChange}
              />
              <button
                type="button"
                onClick={() => fetchAllData()}
                disabled={loading}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentStatus !== null && !loading && !error && (
          <div className="mb-6 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset ${
                currentStatus
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
                  : 'bg-slate-500/10 text-slate-400 ring-slate-500/30'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${currentStatus ? 'animate-pulse' : ''}`} />
              {currentStatus ? 'Pump Running' : 'Pump Stopped'}
            </span>
            {processed?.lastMessageTimestamp && (
              <span className="text-xs text-slate-500">
                Last communication: {new Date(processed.lastMessageTimestamp * 1000).toLocaleString('en-US', { timeZone: TIMEZONE, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">Unable to load data</p>
              <p className="mt-1 text-sm text-amber-400/80">{error}</p>
            </div>
          </div>
        )}

        {loading && !processed && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading messages from flespi…</span>
          </div>
        )}

        {processed && (
          <div className={`space-y-8 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Daily Summary — {format(selectedDate, 'EEEE, MMM d, yyyy')}
              </h2>
              <DayStats stats={processed.stats} />
            </section>

            <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Runtime Timeline
              </h2>
              <Timeline
                segments={processed.timelineSegments}
                windowStart={selectedDayStart}
                windowEnd={selectedDayEnd}
                selectedDayStart={selectedDayStart}
                selectedDate={selectedDate}
                temperature={processed.temperature}
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  <MapPin className="h-4 w-4" />
                  Pump Location
                </h2>
                <PumpMap position={pump.location} siteName={pump.name} />
              </section>

              <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Start / Stop Events
                </h2>
                <EventList events={processed.events} />
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6" />
    </div>
  )
}
