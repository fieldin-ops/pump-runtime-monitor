import { AlertTriangle, ArrowLeft, Bell, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AlertsTable } from '../components/AlertsTable'
import {
  filterUnreadAlerts,
  markAlertAsRead,
  useReadAlertIds,
} from '../lib/alertStorage'
import { generateAlerts, sortAlertsForDisplay, type PumpAlert } from '../lib/alerts'
import {
  FIRST_DAY,
  FLESPI_TOKEN,
  FLESPI_TOKEN_PLACEHOLDER,
  getPumpSite,
} from '../lib/constants'
import { fetchDeviceMessages } from '../lib/flespi'
import { dayBounds } from '../lib/pumpLogic'

export function PumpAlertsPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const pump = siteId ? getPumpSite(siteId) : undefined
  const readAlertIds = useReadAlertIds()
  const [alerts, setAlerts] = useState<PumpAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
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
      setAlerts(generateAlerts(messages, pump.siteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [pump])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeAlerts = useMemo(
    () => filterUnreadAlerts(alerts, readAlertIds),
    [alerts, readAlertIds],
  )

  const sortedAlerts = useMemo(
    () => sortAlertsForDisplay(alerts, readAlertIds),
    [alerts, readAlertIds],
  )

  const handleAlertClick = useCallback(
    (alert: PumpAlert) => {
      navigate(`/pump/${alert.siteId}?date=${alert.date}`)
    },
    [navigate],
  )

  if (!siteId || !pump) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to={`/pump/${pump.siteId}`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {pump.name}
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
              <p className="mt-1 text-sm text-slate-400">{pump.name}</p>
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

        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading alerts…</span>
          </div>
        ) : (
          <AlertsTable
            alerts={sortedAlerts}
            readIds={readAlertIds}
            onAlertClick={handleAlertClick}
            onMarkAsRead={markAlertAsRead}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 py-6" />
    </div>
  )
}
