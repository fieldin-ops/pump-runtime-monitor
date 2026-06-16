import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertsTable } from '../components/AlertsTable'
import {
  filterUnreadAlerts,
  markAlertAsRead,
  useReadAlertIds,
} from '../lib/alertStorage'
import {
  alertTypeLabel,
  buildFleetAlerts,
  fetchAllPumpAlerts,
  sortAlertsForDisplay,
  type FleetAlert,
  type PumpAlert,
} from '../lib/alerts'
import {
  FLESPI_TOKEN,
  FLESPI_TOKEN_PLACEHOLDER,
  PUMP_SITES,
} from '../lib/constants'
import { fetchAllPumpSummaries, type PumpSummary } from '../lib/pumpSummary'

function fleetAlertTypeLabel(type: FleetAlert['type']): string {
  switch (type) {
    case 'communication':
      return 'Communication'
    case 'error':
      return 'Error'
    case 'interrupted':
      return alertTypeLabel('interrupted')
    case 'short-runtime':
      return alertTypeLabel('short-runtime')
  }
}

function fleetAlertTypeClass(type: FleetAlert['type']): string {
  switch (type) {
    case 'communication':
      return 'bg-amber-500/10 text-amber-400 ring-amber-500/30'
    case 'error':
      return 'bg-red-500/10 text-red-400 ring-red-500/30'
    case 'interrupted':
      return 'bg-amber-500/10 text-amber-400 ring-amber-500/30'
    case 'short-runtime':
      return 'bg-red-500/10 text-red-400 ring-red-500/30'
  }
}

export function AlertsPage() {
  const navigate = useNavigate()
  const readAlertIds = useReadAlertIds()
  const [summaries, setSummaries] = useState<PumpSummary[]>([])
  const [runtimeAlerts, setRuntimeAlerts] = useState<PumpAlert[]>([])
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
      const [summaryData, alerts] = await Promise.all([
        fetchAllPumpSummaries(PUMP_SITES),
        fetchAllPumpAlerts(PUMP_SITES),
      ])
      setSummaries(summaryData)
      setRuntimeAlerts(alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
      setSummaries([])
      setRuntimeAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const fleetAlerts = useMemo(
    () => buildFleetAlerts(summaries, runtimeAlerts),
    [summaries, runtimeAlerts],
  )

  const activeAlerts = useMemo(
    () => filterUnreadAlerts(fleetAlerts, readAlertIds),
    [fleetAlerts, readAlertIds],
  )

  const systemAlerts = useMemo(
    () =>
      sortAlertsForDisplay(
        fleetAlerts.filter(
          (a) => a.type === 'communication' || a.type === 'error',
        ),
        readAlertIds,
      ),
    [fleetAlerts, readAlertIds],
  )

  const sortedRuntimeAlerts = useMemo(
    () => sortAlertsForDisplay(runtimeAlerts, readAlertIds),
    [runtimeAlerts, readAlertIds],
  )

  const siteNames = useMemo(
    () => Object.fromEntries(PUMP_SITES.map((p) => [p.siteId, p.name])),
    [],
  )

  const handleRuntimeAlertClick = useCallback(
    (alert: PumpAlert) => {
      navigate(`/pump/${alert.siteId}?date=${alert.date}`)
    },
    [navigate],
  )

  const handleSystemAlertNavigate = useCallback(
    (alert: FleetAlert) => {
      if (alert.date) {
        navigate(`/pump/${alert.siteId}?date=${alert.date}`)
      } else {
        navigate(`/pump/${alert.siteId}`)
      }
    },
    [navigate],
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to fleet overview
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-white">Alerts</h1>
                {activeAlerts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-300">
                    <Bell className="h-3 w-3" />
                    {activeAlerts.length} active
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
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
              <p className="text-sm font-medium text-amber-300">Unable to load alerts</p>
              <p className="mt-1 text-sm text-amber-400/80">{error}</p>
            </div>
          </div>
        )}

        {loading && fleetAlerts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading alerts…</span>
          </div>
        ) : (
          <div className="space-y-8">
            {systemAlerts.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  System Alerts
                </h2>
                <div className="overflow-hidden rounded-xl border border-slate-700/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Site</th>
                        <th className="px-4 py-3">Alert Type</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {systemAlerts.map((alert) => {
                        const isRead = readAlertIds.has(alert.id)

                        return (
                          <tr
                            key={alert.id}
                            className={`group cursor-pointer transition-colors hover:bg-slate-800/50 ${
                              isRead ? 'opacity-50' : ''
                            }`}
                            onClick={() => handleSystemAlertNavigate(alert)}
                          >
                            <td className="px-4 py-3 font-medium text-white group-hover:text-cyan-300">
                              {alert.siteName}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${fleetAlertTypeClass(alert.type)}`}
                              >
                                {fleetAlertTypeLabel(alert.type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{alert.message}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                  isRead
                                    ? 'bg-slate-500/10 text-slate-400 ring-slate-500/30'
                                    : 'bg-red-500/10 text-red-400 ring-red-500/30'
                                }`}
                              >
                                {isRead ? 'Read' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAlertAsRead(alert.id)
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-600/60 px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200"
                                  >
                                    <Check className="h-3 w-3" />
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSystemAlertNavigate(alert)
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400/70 group-hover:text-cyan-400"
                                >
                                  View pump
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Runtime Alerts
              </h2>
              <AlertsTable
                alerts={sortedRuntimeAlerts}
                readIds={readAlertIds}
                showSite
                siteNames={siteNames}
                onAlertClick={handleRuntimeAlertClick}
                onMarkAsRead={markAlertAsRead}
              />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6" />
    </div>
  )
}
