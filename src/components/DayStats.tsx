import { Activity, Clock, Play, Square } from 'lucide-react'
import type { DayStats as DayStatsType } from '../lib/pumpLogic'
import { formatDuration } from '../lib/pumpLogic'

interface DayStatsProps {
  stats: DayStatsType
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  icon: typeof Clock
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accent}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl font-bold text-slate-100">{value}</p>
    </div>
  )
}

export function DayStats({ stats }: DayStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Runtime"
        value={formatDuration(stats.totalRuntimeHours)}
        icon={Clock}
        accent="bg-emerald-500/15 text-emerald-400"
      />
      <StatCard
        label="Start Events"
        value={stats.startCount}
        icon={Play}
        accent="bg-cyan-500/15 text-cyan-400"
      />
      <StatCard
        label="Stop Events"
        value={stats.stopCount}
        icon={Square}
        accent="bg-slate-500/15 text-slate-400"
      />
      <StatCard
        label="Longest Run"
        value={formatDuration(stats.longestRunHours)}
        icon={Activity}
        accent="bg-amber-500/15 text-amber-400"
      />
    </div>
  )
}
