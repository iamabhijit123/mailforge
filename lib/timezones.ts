export const TIMEZONE_OPTIONS = [
  { label: 'EST/EDT – Eastern US (UTC-5/-4)',      iana: 'America/New_York' },
  { label: 'CST/CDT – Central US (UTC-6/-5)',      iana: 'America/Chicago' },
  { label: 'MST/MDT – Mountain US (UTC-7/-6)',     iana: 'America/Denver' },
  { label: 'MST – Arizona (UTC-7)',                iana: 'America/Phoenix' },
  { label: 'PST/PDT – Pacific US (UTC-8/-7)',      iana: 'America/Los_Angeles' },
  { label: 'AKST/AKDT – Alaska (UTC-9/-8)',        iana: 'America/Anchorage' },
  { label: 'HST – Hawaii (UTC-10)',                iana: 'Pacific/Honolulu' },
  { label: 'BRT – Brazil / São Paulo (UTC-3)',     iana: 'America/Sao_Paulo' },
  { label: 'GMT/BST – London (UTC+0/+1)',          iana: 'Europe/London' },
  { label: 'CET/CEST – Paris / Berlin (UTC+1/+2)', iana: 'Europe/Paris' },
  { label: 'EET/EEST – Athens / Cairo (UTC+2/+3)', iana: 'Europe/Athens' },
  { label: 'MSK – Moscow (UTC+3)',                 iana: 'Europe/Moscow' },
  { label: 'GST – Dubai (UTC+4)',                  iana: 'Asia/Dubai' },
  { label: 'PKT – Karachi (UTC+5)',                iana: 'Asia/Karachi' },
  { label: 'IST – India (UTC+5:30)',               iana: 'Asia/Kolkata' },
  { label: 'BST – Dhaka (UTC+6)',                  iana: 'Asia/Dhaka' },
  { label: 'ICT – Bangkok / Ho Chi Minh (UTC+7)', iana: 'Asia/Bangkok' },
  { label: 'CST – China / Beijing (UTC+8)',        iana: 'Asia/Shanghai' },
  { label: 'SGT – Singapore (UTC+8)',              iana: 'Asia/Singapore' },
  { label: 'JST – Japan (UTC+9)',                  iana: 'Asia/Tokyo' },
  { label: 'KST – Korea (UTC+9)',                  iana: 'Asia/Seoul' },
  { label: 'AEST/AEDT – Sydney (UTC+10/+11)',      iana: 'Australia/Sydney' },
  { label: 'NZST/NZDT – Auckland (UTC+12/+13)',   iana: 'Pacific/Auckland' },
  { label: 'UTC (UTC±0)',                          iana: 'UTC' },
] as const

export type IanaTimezone = typeof TIMEZONE_OPTIONS[number]['iana']

/** Return the friendly label for an IANA string, or the raw string if not found */
export function tzLabel(iana: string): string {
  return TIMEZONE_OPTIONS.find(t => t.iana === iana)?.label ?? iana
}

/** Today's date string (YYYY-MM-DD) in the given IANA timezone */
export function todayInTz(iana: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: iana, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Current HH:MM in the given IANA timezone */
export function currentTimeInTz(iana: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: iana, hour: '2-digit', minute: '2-digit' }).format(new Date())
}
