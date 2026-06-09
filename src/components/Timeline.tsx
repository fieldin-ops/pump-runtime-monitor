import { format } from 'date-fns'
import { Play, Square } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { TIMEZONE } from '../lib/constants'
import type { TemperaturePoint, TimelineSegment } from '../lib/pumpLogic'
import {
  isTodayInTimezone,
  segmentPercent,
  timestampPercent,
} from '../lib/pumpLogic'

interface TimelineProps {
  segments: TimelineSegment[]
  windowStart: number
  windowEnd: number
  selectedDayStart: number
  selectedDate: Date
  temperature: TemperaturePoint[]
}

const HOUR_MARKS_24 = [0, 3, 6, 9, 12, 15, 18, 21, 24]

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatHourLabel(hour: number): string {
  return `${String(hour === 24 ? 0 : hour).padStart(2, '0')}:00`
}

function pickLabelPoints(
  points: TemperaturePoint[],
  windowStart: number,
  windowEnd: number,
  maxLabels = 7,
): TemperaturePoint[] {
  if (points.length <= maxLabels) return points

  const interval = (windowEnd - windowStart) / (maxLabels - 1)
  const labels: TemperaturePoint[] = []

  for (let i = 0; i < maxLabels; i++) {
    const targetTs = windowStart + i * interval
    let closest = points[0]
    let minDist = Math.abs(points[0].timestamp - targetTs)

    for (const pt of points) {
      const dist = Math.abs(pt.timestamp - targetTs)
      if (dist < minDist) {
        minDist = dist
        closest = pt
      }
    }

    if (!labels.some((l) => l.timestamp === closest.timestamp)) {
      labels.push(closest)
    }
  }

  return labels
}

export function Timeline({
  segments,
  windowStart,
  windowEnd,
  selectedDayStart: _selectedDayStart,
  selectedDate,
  temperature,
}: TimelineProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  const showNow = now >= windowStart && now <= windowEnd
  const nowPct = timestampPercent(now, windowStart, windowEnd)

  const showFutureDim =
    isTodayInTimezone(selectedDate) && now >= windowStart && now < windowEnd
  const futureStartPct = showFutureDim ? nowPct : null

  const hourMarks = useMemo(
    () =>
      HOUR_MARKS_24.map((hour) => ({
        hour,
        pct: (hour / 24) * 100,
        label: formatHourLabel(hour),
      })),
    [],
  )

  const dateLabel = format(selectedDate, 'EEE, MMM d, yyyy')

  const tempChart = useMemo(() => {
    if (temperature.length === 0) return null

    const temps = temperature.map((p) => p.tempF)
    const minTemp = Math.min(...temps)
    const maxTemp = Math.max(...temps)
    const range = maxTemp - minTemp || 1
    const padding = range * 0.1

    const toY = (tempF: number) => {
      const normalized = (tempF - (minTemp - padding)) / (range + padding * 2)
      return 1 - normalized
    }

    const linePoints = temperature
      .map((p) => {
        const x = timestampPercent(p.timestamp, windowStart, windowEnd)
        const y = toY(p.tempF) * 100
        return `${x},${y}`
      })
      .join(' ')

    const labelPoints = pickLabelPoints(temperature, windowStart, windowEnd)

    return { linePoints, labelPoints, minTemp, maxTemp }
  }, [temperature, windowStart, windowEnd])

  return (
    <div className="space-y-2">
      <div className="mb-1 text-center text-xs font-medium text-slate-400">
        {dateLabel}
      </div>

      {tempChart && (
        <div className="relative h-8 overflow-hidden rounded-lg border border-amber-500/20 bg-slate-900/60">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              points={tempChart.linePoints}
              fill="none"
              stroke="rgb(251 146 60 / 0.7)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {tempChart.labelPoints.map((pt) => {
            const left = timestampPercent(pt.timestamp, windowStart, windowEnd)
            return (
              <div
                key={pt.timestamp}
                className="pointer-events-none absolute -translate-x-1/2"
                style={{ left: `${left}%`, top: '2px' }}
              >
                <span className="rounded bg-amber-500/20 px-1 py-px font-mono text-[8px] text-amber-400/90">
                  {Math.round(pt.tempF)}°F
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="relative h-10 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/80">
        {segments.map((seg, i) => {
          const { left, width } = segmentPercent(seg, windowStart, windowEnd)
          return (
            <div
              key={i}
              className={`absolute top-0 h-full transition-colors ${
                seg.running ? 'bg-emerald-500/80' : 'bg-slate-600/60'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          )
        })}

        {showFutureDim && futureStartPct !== null && (
          <div
            className="absolute top-0 h-full bg-slate-950/50"
            style={{
              left: `${futureStartPct}%`,
              width: `${100 - futureStartPct}%`,
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(15,23,42,0.4) 3px, rgba(15,23,42,0.4) 6px)',
            }}
          />
        )}

        {showNow && (
          <div
            className="pointer-events-none absolute top-0 z-10 h-full"
            style={{ left: `${nowPct}%` }}
          >
            <div className="relative h-full w-0.5 -translate-x-1/2 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded bg-cyan-500/90 px-1 py-px text-[8px] font-bold tracking-wider text-slate-900">
              NOW
            </span>
          </div>
        )}
      </div>

      <div className="relative h-14">
        {(() => {
          const markers = segments
            .map((seg, i) => {
              if (i === 0) return null
              const { left } = segmentPercent(seg, windowStart, windowEnd)
              return { left, running: seg.running, ts: seg.start, idx: i }
            })
            .filter(Boolean) as { left: number; running: boolean; ts: number; idx: number }[]

          // Assign rows to avoid overlap (labels ~6% wide)
          const rows: number[] = []
          for (let i = 0; i < markers.length; i++) {
            let row = 0
            for (let j = 0; j < i; j++) {
              if (rows[j] === row && Math.abs(markers[i].left - markers[j].left) < 6) {
                row++
              }
            }
            rows.push(row)
          }

          return markers.map((m, i) => (
            <div
              key={m.idx}
              className="absolute flex flex-col items-center"
              style={{ left: `${m.left}%`, top: `${rows[i] * 18}px`, transform: 'translateX(-50%)' }}
            >
              <div className="h-2 w-px bg-slate-500/60" />
              <div
                className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-mono whitespace-nowrap ${
                  m.running ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {m.running ? (
                  <Play className="h-2.5 w-2.5" />
                ) : (
                  <Square className="h-2.5 w-2.5" />
                )}
                {formatTime(m.ts)}
              </div>
            </div>
          ))
        })()}
      </div>

      <div className="relative h-5">
        {hourMarks.map((mark) => (
          <div
            key={mark.hour}
            className="absolute -translate-x-1/2"
            style={{ left: `${mark.pct}%` }}
          >
            <span className="font-mono text-[10px] text-slate-500">{mark.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-emerald-500/80" />
          <Play className="h-3 w-3 text-emerald-400" />
          Pump ON
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-slate-600/60" />
          <Square className="h-3 w-3 text-slate-400" />
          Pump OFF
        </span>
        {tempChart && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded-sm bg-amber-400/70" />
            Device Temp (°F)
          </span>
        )}
      </div>
    </div>
  )
}
