/**
 * European date helpers. Browsers store <input type="date"> values as ISO
 * (YYYY-MM-DD), which European clients and photographers misread, so we
 * show them as DD.MM.YYYY.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
// A bare ISO date that is not part of a timestamp (no "T…" or time after it)
const ISO_DATE_IN_TEXT = /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\dT:-])/g

/** "2027-05-06" → "06.05.2027". Returns the input unchanged if it is not an ISO date. */
export function formatIsoDateEU(value: string): string {
  const m = ISO_DATE.exec(value.trim())
  return m ? `${m[3]}.${m[2]}.${m[1]}` : value
}

/** Replaces every bare ISO date inside a text with DD.MM.YYYY. */
export function replaceIsoDatesEU(text: string): string {
  return text.replace(ISO_DATE_IN_TEXT, (_, y, mo, d) => `${d}.${mo}.${y}`)
}
