import {
  DEVICE_ID,
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
  from: number,
  to: number,
): Promise<FlespiMessage[]> {
  const data = JSON.stringify({
    from,
    to,
    fields:
      'timestamp,engine.ignition.status,position.latitude,position.longitude,position.speed,device.temperature',
  })

  const url = `${FLESPI_API_BASE}/gw/devices/${DEVICE_ID}/messages?data=${encodeURIComponent(data)}`

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
