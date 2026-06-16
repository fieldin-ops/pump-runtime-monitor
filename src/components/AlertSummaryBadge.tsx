import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AlertSummaryBadgeProps {
  count: number
  totalAlerts?: number
  to: string
  label?: string
}

export function AlertSummaryBadge({ count, totalAlerts = 0, to, label }: AlertSummaryBadgeProps) {
  if (count === 0 && totalAlerts === 0) return null

  if (count === 0) {
    return (
      <Link
        to={to}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-600/30 bg-slate-700/20 px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-500/50 hover:bg-slate-700/30"
      >
        <Bell className="h-3.5 w-3.5 shrink-0" />
        <span>View alerts</span>
      </Link>
    )
  }

  const text =
    label ??
    `${count} active alert${count !== 1 ? 's' : ''}`

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/20 transition-colors hover:border-red-500/50 hover:bg-red-500/15"
    >
      <Bell className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs tabular-nums text-red-400">
        {count}
      </span>
    </Link>
  )
}
