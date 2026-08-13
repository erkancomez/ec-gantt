import { format as dateFnsFormat } from 'date-fns';
import { GanttColumnModel, ViewScale } from './gantt.models';

/**
 * Binary search for sorted arrays. O(log n) performance.
 */
export function binarySearch<T>(
  sortedArray: T[],
  value: any,
  comparator: (a: T, b: any) => number
): T | null {
  let low = 0;
  let high = sortedArray.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = comparator(sortedArray[mid], value);

    if (cmp < 0) {
      low = mid + 1;
    } else if (cmp > 0) {
      high = mid - 1;
    } else {
      return sortedArray[mid];
    }
  }
  return null;
}

/**
 * Binary search array for an item containing a specific date
 */
export function getColumnByDate(columns: GanttColumnModel[], date: Date): GanttColumnModel | null {
  let low = 0;
  let high = columns.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const col = columns[mid];
    
    if (date < col.date) {
      high = mid - 1;
    } else if (date >= col.endDate) {
      low = mid + 1;
    } else {
      return col;
    }
  }
  return null;
}

/**
 * Binary search array for an item containing a specific position (x)
 */
export function getColumnByPosition(columns: GanttColumnModel[], x: number): GanttColumnModel | null {
  let low = 0;
  let high = columns.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const col = columns[mid];
    
    if (x < col.left) {
      high = mid - 1;
    } else if (x >= col.left + col.width) {
      low = mid + 1;
    } else {
      return col;
    }
  }
  return null;
}

/**
 * Generate RFC v4 UUID
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get default headers for a view scale
 */
export function getDefaultHeaders(viewScale: ViewScale): string[] {
  switch (viewScale) {
    case 'year': return ['year'];
    case 'quarter': return ['year', 'quarter'];
    case 'month': return ['year', 'month'];
    case 'week': return ['month', 'week'];
    case 'day': return ['month', 'week', 'day'];
    case 'hour': return ['day', 'hour'];
    case 'minute': return ['hour', 'minute'];
    default: return ['month', 'day'];
  }
}

/**
 * Get default date format for a scale
 */
export function getDefaultHeaderFormat(scale: string): string {
  switch (scale) {
    case 'year': return 'yyyy';
    case 'quarter': return 'QQQ yyyy';
    case 'month': return 'MMMM yyyy';
    case 'week': return 'wo yyyy';
    case 'day': return 'EEEE, d MMM yyyy';
    case 'hour': return 'HH:mm';
    case 'minute': return 'HH:mm';
    default: return 'yyyy-MM-dd';
  }
}

/**
 * Format a date for headers using date-fns
 */
export function formatHeaderDate(date: Date, formatStr: string, viewScale: ViewScale): string {
  try {
    return dateFnsFormat(date, formatStr);
  } catch (e) {
    return date.toString();
  }
}
