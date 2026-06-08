import { addDays, format, subDays } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { FIRST_DAY, TIMEZONE } from '../lib/constants'

interface DayPickerProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export function DayPicker({ selectedDate, onChange }: DayPickerProps) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const isToday = format(selectedDate, 'yyyy-MM-dd') === todayStr

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(subDays(selectedDate, 1))}
        disabled={format(selectedDate, 'yyyy-MM-dd') <= FIRST_DAY}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/50 px-4 py-2">
        <Calendar className="h-4 w-4 text-cyan-400" />
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          min={FIRST_DAY}
          max={todayStr}
          onChange={(e) => {
            if (e.target.value) onChange(new Date(e.target.value + 'T12:00:00'))
          }}
          className="bg-transparent font-mono text-sm text-slate-100 outline-none [color-scheme:dark]"
        />
        {isToday && (
          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30">
            Today
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(addDays(selectedDate, 1))}
        disabled={isToday}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
