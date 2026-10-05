// Hermes's Intl.DateTimeFormat does not support the `dateStyle`/`timeStyle`
// shorthand options — `toLocaleString([], {dateStyle: 'medium'})` throws
// "Invalid dateStyle option" at render time (live finding on the Discover
// list view). These helpers format in the device's local time with plain
// Date getters instead, which every JS engine supports.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type DateInput = string | number | Date;

function asDate(input: DateInput): Date | null {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** e.g. "6:00 PM" */
export function formatTime(input: DateInput): string {
  const d = asDate(input);
  if (!d) {
    return '—';
  }
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${h12}:${mm} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

/** e.g. "27 Sep 2026, 6:00 PM" */
export function formatDateTime(input: DateInput): string {
  const d = asDate(input);
  if (!d) {
    return '—';
  }
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${formatTime(d)}`;
}

/** e.g. "Sep 2026" — used for "Member since" labels. */
export function formatMonthYear(input: DateInput): string {
  const d = asDate(input);
  if (!d) {
    return '—';
  }
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
