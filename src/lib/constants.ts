export const FLESPI_TOKEN_PLACEHOLDER = 'YOUR_FLESPI_TOKEN_HERE'
export const FLESPI_TOKEN: string =
  '6TzVasvDaWJ1dTTS9xEhPStXNpRgZHY6mfPVtTmcWAq1fWxbuPim09szTsCrhdT0'

export const FLESPI_API_BASE = 'https://flespi.io'

export interface PumpSiteConfig {
  siteId: string
  name: string
  deviceId: string
  flespiDeviceId: number
}

export const PUMP_SITES: PumpSiteConfig[] = [
  {
    siteId: 'chestnut',
    name: 'Chestnut',
    deviceId: '867284062694239',
    flespiDeviceId: 7599984,
  },
]

export function getPumpSite(siteId: string): PumpSiteConfig | undefined {
  return PUMP_SITES.find((p) => p.siteId === siteId)
}

/** @deprecated Use PUMP_SITES[0] — kept for backward compatibility */
export const DEVICE_ID = PUMP_SITES[0].flespiDeviceId
/** @deprecated Use PUMP_SITES[0] — kept for backward compatibility */
export const DEVICE_IDENT = PUMP_SITES[0].deviceId
/** @deprecated Use PUMP_SITES[0] — kept for backward compatibility */
export const PUMP_SITE_NAME = PUMP_SITES[0].name

export const TIMEZONE = 'America/Los_Angeles'

export const FIRST_DAY = '2026-06-08'

/** Rapid ignition alternation within this window is treated as noise */
export const NOISE_WINDOW_SECONDS = 60
export const NOISE_FLIP_THRESHOLD = 3

/** No message within this window is treated as a communication issue */
export const COMMUNICATION_TIMEOUT_SECONDS = 30 * 60
