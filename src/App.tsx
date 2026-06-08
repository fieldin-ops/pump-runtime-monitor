import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Power,
  Thermometer,
} from 'lucide-react'

type PumpStatus = 'running' | 'stopped' | 'warning'

interface Pump {
  id: string
  name: string
  location: string
  status: PumpStatus
  runtimeHoursToday: number
  totalRuntimeHours: number
  temperature: number
  pressure: number
}

const pumps: Pump[] = [
  {
    id: 'P-101',
    name: 'Primary Lift Pump',
    location: 'Station A',
    status: 'running',
    runtimeHoursToday: 14.2,
    totalRuntimeHours: 4821,
    temperature: 68,
    pressure: 142,
  },
  {
    id: 'P-102',
    name: 'Booster Pump #1',
    location: 'Station A',
    status: 'running',
    runtimeHoursToday: 11.8,
    totalRuntimeHours: 3910,
    temperature: 72,
    pressure: 138,
  },
  {
    id: 'P-103',
    name: 'Transfer Pump',
    location: 'Station B',
    status: 'warning',
    runtimeHoursToday: 6.4,
    totalRuntimeHours: 2156,
    temperature: 89,
    pressure: 118,
  },
  {
    id: 'P-104',
    name: 'Irrigation Pump',
    location: 'Field North',
    status: 'running',
    runtimeHoursToday: 9.1,
    totalRuntimeHours: 5673,
    temperature: 65,
    pressure: 155,
  },
  {
    id: 'P-105',
    name: 'Backup Pump',
    location: 'Station B',
    status: 'stopped',
    runtimeHoursToday: 0,
    totalRuntimeHours: 890,
    temperature: 58,
    pressure: 0,
  },
  {
    id: 'P-106',
    name: 'Chemical Dosing Pump',
    location: 'Treatment Plant',
    status: 'warning',
    runtimeHoursToday: 3.2,
    totalRuntimeHours: 1244,
    temperature: 78,
    pressure: 95,
  },
]

const statusConfig: Record<
  PumpStatus,
  { label: string; badge: string; dot: string; icon: typeof Power }
> = {
  running: {
    label: 'Running',
    badge: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    dot: 'bg-emerald-400 shadow-emerald-400/50',
    icon: Activity,
  },
  stopped: {
    label: 'Stopped',
    badge: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    dot: 'bg-slate-500 shadow-slate-500/50',
    icon: Power,
  },
  warning: {
    label: 'Warning',
    badge: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    dot: 'bg-amber-400 shadow-amber-400/50',
    icon: AlertTriangle,
  },
}

function formatHours(hours: number): string {
  return hours.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function PumpCard({ pump }: { pump: Pump }) {
  const config = statusConfig[pump.status]
  const StatusIcon = config.icon

  return (
    <article className="group rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 shadow-lg shadow-black/20 transition-colors hover:border-slate-600/80 hover:bg-slate-800/70">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-wider text-slate-500">
            {pump.id}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-100">
            {pump.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{pump.location}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.badge}`}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">Today</span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-100">
            {formatHours(pump.runtimeHoursToday)}
            <span className="ml-1 text-xs font-normal text-slate-500">hrs</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            <span className="text-xs">Total</span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-100">
            {formatHours(pump.totalRuntimeHours)}
            <span className="ml-1 text-xs font-normal text-slate-500">hrs</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Thermometer className="h-3.5 w-3.5" />
            <span className="text-xs">Temp</span>
          </div>
          <p
            className={`mt-1 font-mono text-lg font-semibold ${
              pump.temperature >= 85
                ? 'text-amber-400'
                : pump.status === 'stopped'
                  ? 'text-slate-500'
                  : 'text-slate-100'
            }`}
          >
            {pump.temperature}
            <span className="ml-0.5 text-xs font-normal text-slate-500">°F</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-xs">Pressure</span>
          </div>
          <p
            className={`mt-1 font-mono text-lg font-semibold ${
              pump.pressure === 0
                ? 'text-slate-500'
                : pump.pressure < 110
                  ? 'text-amber-400'
                  : 'text-slate-100'
            }`}
          >
            {pump.pressure}
            <span className="ml-0.5 text-xs font-normal text-slate-500">psi</span>
          </p>
        </div>
      </div>
    </article>
  )
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  icon: typeof Activity
  accent: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/40 px-5 py-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="font-mono text-2xl font-bold text-slate-100">{value}</p>
      </div>
    </div>
  )
}

export default function App() {
  const runningCount = pumps.filter((p) => p.status === 'running').length
  const alertCount = pumps.filter((p) => p.status === 'warning').length
  const avgRuntime =
    pumps.reduce((sum, p) => sum + p.runtimeHoursToday, 0) / pumps.length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Gauge className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Pump Runtime Monitor
                </h1>
                <p className="text-sm text-slate-400">
                  Industrial pump fleet overview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-emerald-400">
                System Online
              </span>
              <span className="text-xs text-slate-500">
                · Updated just now
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            label="Total Pumps"
            value={pumps.length}
            icon={Gauge}
            accent="bg-slate-700/50 text-slate-300"
          />
          <SummaryStat
            label="Running"
            value={runningCount}
            icon={Activity}
            accent="bg-emerald-500/15 text-emerald-400"
          />
          <SummaryStat
            label="Alerts"
            value={alertCount}
            icon={AlertTriangle}
            accent="bg-amber-500/15 text-amber-400"
          />
          <SummaryStat
            label="Avg Runtime Today"
            value={`${formatHours(avgRuntime)} hrs`}
            icon={Clock}
            accent="bg-cyan-500/15 text-cyan-400"
          />
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Pump Fleet
            </h2>
            <span className="font-mono text-xs text-slate-600">
              {runningCount}/{pumps.length} active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pumps.map((pump) => (
              <PumpCard key={pump.id} pump={pump} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
        Pump Runtime Monitor · Mock telemetry data
      </footer>
    </div>
  )
}
