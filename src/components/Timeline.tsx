import { format } from 'date-fns'
import type { TimelineSegment } from '../lib/pumpLogic'
import { segmentPercent } from '../lib/pumpLogic'

interface TimelineProps {
  segments: TimelineSegment[]
  dayStart: number
  dayEnd: number
}

const HOUR_MARKS = [0, 6, 12, 18, 24]

export function Timeline({ segments, dayStart, dayEnd }: TimelineProps) {
  return (
    <div className="space-y-3">
      <div className="relative h-10 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/80">
        {segments.map((seg, i) => {
          const { left, width } = segmentPercent(seg, dayStart, dayEnd)
          return (
            <div
              key={i}
              className={`absolute top-0 h-full transition-colors ${
                seg.running ? 'bg-emerald-500/80' : 'bg-slate-600/60'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${seg.running ? 'Running' : 'Stopped'} · ${format(new Date(seg.start * 1000), 'HH:mm')} – ${format(new Date(seg.end * 1000), 'HH:mm')}`}
            />
          )
        })}
      </div>

      <div className="relative h-4">
        {HOUR_MARKS.map((hour) => {
          const pct = (hour / 24) * 100
          return (
            <div
              key={hour}
              className="absolute -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              <span className="font-mono text-[10px] text-slate-500">
                {hour === 24 ? '00' : String(hour).padStart(2, '0')}:00
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-emerald-500/80" />
          Pump ON
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-slate-600/60" />
          Pump OFF
        </span>
      </div>
    </div>
  )
}
