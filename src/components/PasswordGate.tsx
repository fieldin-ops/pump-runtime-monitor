import { Gauge, Lock, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

const AUTH_KEY = 'pump-monitor-auth'
const PASSWORD_HASH =
  'eed2bbef2e52630e4cb4171734790f4e23e036bc3e20f76da4d42cbe4c94cccc'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type PasswordGateProps = {
  children: ReactNode
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setAuthenticated(sessionStorage.getItem(AUTH_KEY) === 'true')
    setChecking(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)

      try {
        const hash = await sha256(password)
        if (hash === PASSWORD_HASH) {
          sessionStorage.setItem(AUTH_KEY, 'true')
          setAuthenticated(true)
        } else {
          setError('Incorrect password')
          setPassword('')
        }
      } catch {
        setError('Authentication failed. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [password],
  )

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 shadow-2xl shadow-black/40">
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Gauge className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Pump Runtime Monitor
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Enter password to continue
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !password}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Access Dashboard'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
