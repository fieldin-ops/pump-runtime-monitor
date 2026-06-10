import {
  FLESPI_API_BASE,
  FLESPI_TOKEN,
} from './constants'

export interface FlespiMessage {
  timestamp: number
  'engine.ignition.status'?: boolean
  'position.latitude'?: number
  'position.longitude'?: number
  'position.speed'?: number
  'device.temperature'?: number
}

interface FlespiResponse<T> {
  result: T[]
  errors?: { code: number; reason: string }[]
}

export async function fetchDeviceMessages(
  deviceId: number,
  from: number,
  to: number,
): Promise<FlespiMessage[]> {
  const data = JSON.stringify({
    from,
    to,
    fields:
      'timestamp,engine.ignition.status,position.latitude,position.longitude,position.speed,device.temperature',
  })

  const url = `${FLESPI_API_BASE}/gw/devices/${deviceId}/messages?data=${encodeURIComponent(data)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `FlespiToken ${FLESPI_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Flespi API error: ${response.status} ${response.statusText}`)
  }

  const body = (await response.json()) as FlespiResponse<FlespiMessage>

  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.reason).join('; '))
  }

  return body.result ?? []
}

export async function fetchLastTimestamp(
  deviceId: number,
): Promise<number | null> {
  const data = JSON.stringify({
    reverse: true,
    count: 1,
    fields: 'timestamp',
  })

  const url = `${FLESPI_API_BASE}/gw/devices/${deviceId}/messages?data=${encodeURIComponent(data)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `FlespiToken ${FLESPI_TOKEN}`,
    },
  })

  if (!response.ok) return null

  const body = (await response.json()) as FlespiResponse<FlespiMessage>
  const messages = body.result ?? []
  return messages.length > 0 ? messages[0].timestamp : null
}

export async function fetchLastPosition(
  deviceId: number,
): Promise<{ lat: number; lng: number } | null> {
  const data = JSON.stringify({
    reverse: true,
    count: 10,
    fields: 'position.latitude,position.longitude',
  })

  const url = `${FLESPI_API_BASE}/gw/devices/${deviceId}/messages?data=${encodeURIComponent(data)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `FlespiToken ${FLESPI_TOKEN}`,
    },
  })

  if (!response.ok) return null

  const body = (await response.json()) as FlespiResponse<FlespiMessage>
  const messages = body.result ?? []

  for (const msg of messages) {
    const lat = msg['position.latitude']
    const lng = msg['position.longitude']
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng }
    }
  }

  return null
}
