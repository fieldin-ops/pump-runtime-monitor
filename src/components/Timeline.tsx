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
/** Break the temp line when consecutive readings are farther apart than this. */
const TEMP_GAP_THRESHOLD_SEC = 15 * 60

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

function splitTemperatureSegments(
  points: TemperaturePoint[],
  gapThresholdSec: number,
): TemperaturePoint[][] {
  if (points.length === 0) return []

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp)
  const segments: TemperaturePoint[][] = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (curr.timestamp - prev.timestamp > gapThresholdSec) {
      segments.push([curr])
    } else {
      segments[segments.length - 1].push(curr)
    }
  }

  return segments
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

    const sorted = [...temperature].sort((a, b) => a.timestamp - b.timestamp)
    const temps = sorted.map((p) => p.tempF)
    const minTemp = Math.min(...temps)
    const maxTemp = Math.max(...temps)
    const range = maxTemp - minTemp || 1
    const padding = range * 0.1

    const toY = (tempF: number) => {
      const normalized = (tempF - (minTemp - padding)) / (range + padding * 2)
      return 1 - normalized
    }

    const pointCoords = (p: TemperaturePoint) => ({
      x: timestampPercent(p.timestamp, windowStart, windowEnd),
      y: toY(p.tempF) * 100,
      point: p,
    })

    const segments = splitTemperatureSegments(
      sorted,
      TEMP_GAP_THRESHOLD_SEC,
    ).map((segment) => {
      const coords = segment.map(pointCoords)
      const linePath = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
        .join(' ')
      const areaPath =
        coords.length >= 2
          ? `${linePath} L ${coords[coords.length - 1].x} 100 L ${coords[0].x} 100 Z`
          : null
      return { coords, linePath, areaPath }
    })

    const labelPoints = pickLabelPoints(sorted, windowStart, windowEnd).map(
      (p) => ({
        ...p,
        yPct: toY(p.tempF) * 100,
      }),
    )

    const currentTemp =
      [...sorted].reverse().find((p) => p.timestamp <= now)?.tempF ??
      sorted[sorted.length - 1]?.tempF

    return {
      segments,
      labelPoints,
      minTemp,
      maxTemp,
      currentTemp,
    }
  }, [temperature, windowStart, windowEnd, now])

  return (
    <div className="space-y-2">
      <div className="mb-1 text-center text-xs font-medium text-slate-400">
        {dateLabel}
      </div>

      {tempChart && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-0.5 text-[11px]">
            <span className="font-medium text-amber-300/90">Device Temperature</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-slate-300">
              <span>
                <span className="text-slate-500">Now </span>
                <span className="font-semibold text-amber-300">
                  {Math.round(tempChart.currentTemp)}°F
                </span>
              </span>
              <span>
                <span className="text-slate-500">Min </span>
                <span className="text-amber-200/90">
                  {Math.round(tempChart.minTemp)}°F
                </span>
              </span>
              <span>
                <span className="text-slate-500">Max </span>
                <span className="text-amber-200/90">
                  {Math.round(tempChart.maxTemp)}°F
                </span>
              </span>
            </div>
          </div>

          <div className="relative h-14 overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-b from-amber-950/40 to-slate-900/80">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="temp-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(251 146 60 / 0.35)" />
                  <stop offset="100%" stopColor="rgb(251 146 60 / 0.03)" />
                </linearGradient>
              </defs>

              {tempChart.segments.map((seg, i) => (
                <g key={i}>
                  {seg.areaPath && (
                    <path d={seg.areaPath} fill="url(#temp-fill-gradient)" />
                  )}
                  <path
                    d={seg.linePath}
                    fill="none"
                    stroke="rgb(251 146 60)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {seg.coords.map((c) => (
                    <circle
                      key={c.point.timestamp}
                      cx={c.x}
                      cy={c.y}
                      r="1.8"
                      fill="rgb(253 186 116)"
                      stroke="rgb(251 146 60)"
                      strokeWidth="0.6"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ))}
            </svg>

            {tempChart.labelPoints.map((pt) => {
              const left = timestampPercent(pt.timestamp, windowStart, windowEnd)
              const aboveLine = pt.yPct > 35
              return (
                <div
                  key={pt.timestamp}
                  className="pointer-events-none absolute -translate-x-1/2"
                  style={{
                    left: `${left}%`,
                    top: aboveLine ? undefined : `${pt.yPct}%`,
                    bottom: aboveLine ? `${100 - pt.yPct}%` : undefined,
                    transform: `translateX(-50%) ${aboveLine ? 'translateY(4px)' : 'translateY(-100%) translateY(-4px)'}`,
                  }}
                >
                  <span className="rounded border border-amber-500/40 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-200 shadow-sm">
                    {Math.round(pt.tempF)}°
                  </span>
                </div>
              )
            })}
          </div>
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
            <span className="inline-block h-1 w-5 rounded-sm bg-amber-400" />
            Device Temp (°F)
          </span>
        )}
      </div>
    </div>
  )
}
