import { Play, Square } from 'lucide-react'
import { TIMEZONE } from '../lib/constants'
import type { PumpEvent } from '../lib/pumpLogic'

interface EventListProps {
  events: PumpEvent[]
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No start/stop events recorded for this day
      </p>
    )
  }

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-2 font-medium">Time</th>
            <th className="px-4 py-2 font-medium">Event</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((event, i) => (
            <tr
              key={i}
              className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/30"
            >
              <td className="px-4 py-2.5 font-mono text-slate-300">
                {new Date(event.timestamp * 1000).toLocaleTimeString('en-US', {
                    timeZone: TIMEZONE,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    event.type === 'start'
                      ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-400 ring-slate-500/30'
                  }`}
                >
                  {event.type === 'start' ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {event.type === 'start' ? 'Pump Started' : 'Pump Stopped'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
