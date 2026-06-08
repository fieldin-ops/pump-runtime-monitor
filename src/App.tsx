import { format } from 'date-fns'
import {
  AlertTriangle,
  Gauge,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DayPicker } from './components/DayPicker'
import { DayStats } from './components/DayStats'
import { EventList } from './components/EventList'
import { PumpMap } from './components/PumpMap'
import { Timeline } from './components/Timeline'
import {
  DEVICE_IDENT,
  DEVICE_NAME,
  FLESPI_TOKEN,
  FLESPI_TOKEN_PLACEHOLDER,
  TIMEZONE,
} from './lib/constants'
import { fetchDeviceMessages } from './lib/flespi'
import {
  processTwoDayMessages,
  twoDayBounds,
  type ProcessedTwoDay,
} from './lib/pumpLogic'

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const nowInTz = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
    return new Date(`${nowInTz}T12:00:00`)
  })
  const [processed, setProcessed] = useState<ProcessedTwoDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (FLESPI_TOKEN === FLESPI_TOKEN_PLACEHOLDER) {
      setError(
        'Set your flespi token in src/lib/constants.ts (FLESPI_TOKEN). Create one at https://flespi.io/tokens',
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { windowStart, windowEnd } = twoDayBounds(selectedDate)
      const messages = await fetchDeviceMessages(windowStart, windowEnd)
      setProcessed(processTwoDayMessages(messages, selectedDate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setProcessed(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60_000)
    return () => clearInterval(interval)
  }, [loadData])

  const bounds = twoDayBounds(selectedDate)
  const currentStatus = processed?.timelineSegments.length
    ? processed.timelineSegments[processed.timelineSegments.length - 1].running
    : null

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Gauge className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Pump Runtime Monitor
                </h1>
                <p className="text-sm text-slate-400">
                  {DEVICE_NAME} · IMEI {DEVICE_IDENT}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <DayPicker
                selectedDate={selectedDate}
                onChange={setSelectedDate}
              />
              <button
                type="button"
                onClick={loadData}
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
                Last transmission: {new Date(processed.lastMessageTimestamp * 1000).toLocaleTimeString('en-US', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
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

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading messages from flespi…</span>
          </div>
        )}

        {!loading && processed && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Daily Summary — {format(selectedDate, 'EEEE, MMM d, yyyy')}
              </h2>
              <DayStats
                stats={processed.stats}
                messageCount={processed.messageCount}
              />
            </section>

            <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Runtime Timeline
              </h2>
              <Timeline
                segments={processed.timelineSegments}
                windowStart={bounds.windowStart}
                windowEnd={bounds.windowEnd}
                selectedDayStart={bounds.selectedDayStart}
                selectedDate={selectedDate}
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  <MapPin className="h-4 w-4" />
                  Pump Location
                </h2>
                <PumpMap position={processed.lastPosition} />
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
