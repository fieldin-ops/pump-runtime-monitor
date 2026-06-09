import {
  AlertTriangle,
  Droplets,
  Loader2,
  Radio,
  RefreshCw,
  Thermometer,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  FLESPI_TOKEN,
  FLESPI_TOKEN_PLACEHOLDER,
  PUMP_SITES,
} from '../lib/constants'
import {
  fetchAllPumpSummaries,
  formatLastRunCycle,
  formatLastTransmission,
  type PumpSummary,
} from '../lib/pumpSummary'

interface Alert {
  id: string
  siteName: string
  siteId: string
  message: string
  type: 'communication' | 'error'
}

export function HomePage() {
  const [summaries, setSummaries] = useState<PumpSummary[]>([])
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
      const data = await fetchAllPumpSummaries(PUMP_SITES)
      setSummaries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pump data')
      setSummaries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60_000)
    return () => clearInterval(interval)
  }, [loadData])

  const alerts = useMemo((): Alert[] => {
    const items: Alert[] = []
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
        items.push({
          id: `${s.pump.siteId}-comm`,
          siteName: s.pump.name,
          siteId: s.pump.siteId,
          message: 'No transmission in the last 30 minutes',
          type: 'communication',
        })
      }
    }
    return items
  }, [summaries])

  const totalPumps = PUMP_SITES.length
  const runningCount = summaries.filter((s) => s.running === true).length
  const communicatingCount = summaries.filter((s) => s.communicating).length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Droplets className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Pump Runtime Monitor
                </h1>
                <p className="text-sm text-slate-400">
                  Fleet overview — {totalPumps} pump site{totalPumps !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">Unable to load data</p>
              <p className="mt-1 text-sm text-amber-400/80">{error}</p>
            </div>
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Alerts
          </h2>
          {loading && summaries.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-6 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking pump status…</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
              <p className="text-sm text-emerald-400/90">
                All pumps communicating — no active alerts
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-red-300">
                      {alert.siteName}
                      {alert.type === 'communication' && ' — Communication issue'}
                      {alert.type === 'error' && ' — Data error'}
                    </p>
                    <p className="mt-0.5 text-sm text-red-400/80">{alert.message}</p>
                  </div>
                  <Link
                    to={`/pump/${alert.siteId}`}
                    className="shrink-0 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total Pumps"
              value={loading && summaries.length === 0 ? '—' : `${summaries.length}/${totalPumps}`}
              icon={<Droplets className="h-5 w-5 text-emerald-400" />}
            />
            <KpiCard
              label="Currently Running"
              value={loading && summaries.length === 0 ? '—' : `${runningCount}/${totalPumps}`}
              icon={<Radio className="h-5 w-5 text-emerald-400" />}
              accent="emerald"
            />
            <KpiCard
              label="Communicating"
              value={
                loading && summaries.length === 0
                  ? '—'
                  : `${communicatingCount}/${totalPumps}`
              }
              icon={
                communicatingCount === totalPumps ? (
                  <Wifi className="h-5 w-5 text-emerald-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-400" />
                )
              }
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Pump Sites
          </h2>

          {loading && summaries.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading pump summaries…</span>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Cycle</th>
                    <th className="px-4 py-3">Temp</th>
                    <th className="px-4 py-3">Last Transmission</th>
                    <th className="px-4 py-3">Comm</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {summaries.map((summary) => (
                    <PumpSiteRow key={summary.pump.siteId} summary={summary} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6" />
    </div>
  )
}

function KpiCard({
  label,
  value,
  sublabel,
  icon,
  accent,
}: {
  label: string
  value: string
  sublabel?: string
  icon: ReactNode
  accent?: 'emerald'
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon}
      </div>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${
          accent === 'emerald' ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
      )}
    </div>
  )
}

function PumpSiteRow({ summary }: { summary: PumpSummary }) {
  const { pump, running, communicating, error: _error } = summary

  const statusLabel =
    running === null ? 'Unknown' : running ? 'Running' : 'Stopped'

  return (
    <tr className="group transition-colors hover:bg-slate-800/50">
      <td className="px-4 py-3">
        <Link to={`/pump/${pump.siteId}`} className="block">
          <span className="font-medium text-white group-hover:text-cyan-300">
            {pump.name}
          </span>
          <span className="ml-2 text-xs text-slate-500">{pump.deviceId}</span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              running === true
                ? 'bg-emerald-400 animate-pulse'
                : running === false
                  ? 'bg-slate-500'
                  : 'bg-slate-600'
            }`}
          />
          <span className={running ? 'text-emerald-400' : 'text-slate-400'}>
            {statusLabel}
          </span>
        </span>
      </td>
      <td className="px-4 py-3 text-slate-300">
        {formatLastRunCycle(summary.lastRunCycleHours, summary.lastRunCycleOngoing)}
      </td>
      <td className="px-4 py-3 text-slate-300">
        {summary.latestTemperatureF !== null
          ? `${Math.round(summary.latestTemperatureF)}°F`
          : '—'}
      </td>
      <td className="px-4 py-3 text-slate-400">
        {formatLastTransmission(summary.lastTransmissionTimestamp)}
      </td>
      <td className="px-4 py-3">
        {communicating ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <Wifi className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-400">
            <WifiOff className="h-3.5 w-3.5" />
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/pump/${pump.siteId}`}
          className="text-xs font-medium text-cyan-400/70 group-hover:text-cyan-400"
        >
          View →
        </Link>
      </td>
    </tr>
  )
}
