/**
 * Date formatting and range helpers for WINDCAST dashboard.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format 'YYYY-MM-DD' as 'D MMM' (e.g., '13 Jan', '1 Feb').
 */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = MONTHS[monthIdx] || parts[1];
  return `${day} ${month}`;
}

/**
 * Format 'YYYY-MM-DD' as 'D MMM YYYY' (e.g., '13 Jan 2026').
 */
export function formatFullDay(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = MONTHS[monthIdx] || parts[1];
  return `${day} ${month} ${year}`;
}

/**
 * Calculate count of calendar days inclusive between two YYYY-MM-DD dates.
 */
export function getDayCountInclusive(startDateStr: string, endDateStr: string): number {
  try {
    const d1 = new Date(`${startDateStr}T00:00:00Z`);
    const d2 = new Date(`${endDateStr}T00:00:00Z`);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 1;
  }
}

/**
 * Generate an array of all YYYY-MM-DD strings between start and end inclusive.
 */
export function getDaysInRange(startDateStr: string, endDateStr: string): string[] {
  const days: string[] = [];
  try {
    const curr = new Date(`${startDateStr}T00:00:00Z`);
    const end = new Date(`${endDateStr}T00:00:00Z`);
    while (curr <= end) {
      days.push(curr.toISOString().slice(0, 10));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  } catch {
    return [startDateStr];
  }
  return days;
}

/**
 * Format an ISO published timestamp as 'D MMM HH:MM' (e.g., '14 Jan 11:30').
 */
export function formatPublishedUtc(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    // If string is YYYY-MM-DDTHH:MM...
    const datePart = isoStr.slice(0, 10);
    const timePart = isoStr.slice(11, 16);
    const dm = formatDayMonth(datePart);
    return `${dm} ${timePart}`;
  } catch {
    return isoStr;
  }
}

/**
 * Scope badge text for panel headers.
 */
export function getScopeBadge(
  rangeMode: 'single' | 'full' | 'custom',
  singleDate: string,
  startDate: string,
  endDate: string,
  isForecastChart = false,
  shownDay = singleDate
): string {
  if (rangeMode === 'single') {
    return `Delivery ${formatDayMonth(singleDate)}`;
  }
  if (isForecastChart) {
    return `Delivery ${formatDayMonth(shownDay)}`;
  }
  const count = getDayCountInclusive(startDate, endDate);
  return `${formatDayMonth(startDate)} to ${formatDayMonth(endDate)} (${count} days)`;
}

/**
 * Format settlement slot timestamp for Data Table:
 * - Single-day mode: '00:00', '00:30'
 * - Multi-day range: '15 Jan 00:00'
 */
export function formatSlotTime(startTimeStr: string, isMultiDay: boolean): string {
  if (!startTimeStr) return '—';
  try {
    const d = new Date(startTimeStr);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      const timeOnly = `${hours}:${mins}`;
      if (!isMultiDay) {
        return timeOnly;
      }
      const day = d.getUTCDate();
      const month = MONTHS[d.getUTCMonth()];
      return `${day} ${month} ${timeOnly}`;
    }
  } catch {
    // Fallback to substring
  }

  // Fallback string slicing if Date parsing fails
  const timePart = startTimeStr.slice(11, 16) || startTimeStr;
  if (!isMultiDay) return timePart;
  const datePart = startTimeStr.slice(0, 10);
  return `${formatDayMonth(datePart)} ${timePart}`.trim();
}

/**
 * Natural language scope phrase for Decision Support and captions:
 * - Single-day: 'on 15 Jan'
 * - Multi-day range: 'between 2 Jan and 1 Feb'
 */
export function getScopePhrase(
  rangeMode: 'single' | 'full' | 'custom',
  singleDate: string,
  startDate: string,
  endDate: string
): string {
  if (rangeMode === 'single') {
    return `on ${formatDayMonth(singleDate)}`;
  }
  return `between ${formatDayMonth(startDate)} and ${formatDayMonth(endDate)}`;
}
