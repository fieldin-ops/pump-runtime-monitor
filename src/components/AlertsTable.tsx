import { Check, ExternalLink } from 'lucide-react'
import { alertTypeLabel, type PumpAlert } from '../lib/alerts'

interface AlertsTableProps {
  alerts: PumpAlert[]
  readIds: Set<string>
  onAlertClick?: (alert: PumpAlert) => void
  onMarkAsRead?: (id: string) => void
  showSite?: boolean
  siteNames?: Record<string, string>
}

export function AlertsTable({
  alerts,
  readIds,
  onAlertClick,
  onMarkAsRead,
  showSite,
  siteNames,
}: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-6 text-center">
        <p className="text-sm text-emerald-400/90">No runtime alerts</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            {showSite && <th className="px-4 py-3">Site</th>}
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Alert Type</th>
            <th className="px-4 py-3">Details</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {alerts.map((alert) => {
            const isRead = readIds.has(alert.id)

            return (
              <tr
                key={alert.id}
                className={`group cursor-pointer transition-colors hover:bg-slate-800/50 ${
                  isRead ? 'opacity-50' : ''
                }`}
                onClick={() => onAlertClick?.(alert)}
              >
                {showSite && (
                  <td className="px-4 py-3 font-medium text-white group-hover:text-cyan-300">
                    {siteNames?.[alert.siteId] ?? alert.siteId}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-white group-hover:text-cyan-300">
                  {alert.date}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      alert.type === 'interrupted'
                        ? 'bg-amber-500/10 text-amber-400 ring-amber-500/30'
                        : 'bg-red-500/10 text-red-400 ring-red-500/30'
                    }`}
                  >
                    {alertTypeLabel(alert.type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{alert.details}</td>
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
                    {!isRead && onMarkAsRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMarkAsRead(alert.id)
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
                        onAlertClick?.(alert)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400/70 group-hover:text-cyan-400"
                    >
                      View day
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
  )
}
