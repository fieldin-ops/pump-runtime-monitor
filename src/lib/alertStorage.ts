import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'pump-runtime-monitor-read-alerts'

type Listener = () => void
const listeners = new Set<Listener>()

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners(): void {
  cachedSnapshot = readFromStorage()
  listeners.forEach((listener) => listener())
}

function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === 'string'))
    }
    return new Set()
  } catch {
    return new Set()
  }
}

let cachedSnapshot: Set<string> = readFromStorage()

export function getReadAlertIds(): Set<string> {
  return cachedSnapshot
}

function getSnapshot(): Set<string> {
  return cachedSnapshot
}

const emptySet = new Set<string>()
function getServerSnapshot(): Set<string> {
  return emptySet
}

export function markAlertAsRead(id: string): void {
  const ids = new Set(cachedSnapshot)
  if (ids.has(id)) return
  ids.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  notifyListeners()
}

export function isAlertRead(id: string): boolean {
  return cachedSnapshot.has(id)
}

export function useReadAlertIds(): Set<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function filterUnreadAlerts<T extends { id: string }>(
  alerts: T[],
  readIds: Set<string>,
): T[] {
  return alerts.filter((alert) => !readIds.has(alert.id))
}
