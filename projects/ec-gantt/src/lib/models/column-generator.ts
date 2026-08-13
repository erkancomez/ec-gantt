import {
  startOfDay, startOfWeek, startOfMonth, startOfYear, startOfHour, startOfMinute, startOfQuarter,
  endOfDay, endOfWeek, endOfMonth, endOfYear, endOfHour, endOfMinute, endOfQuarter,
  addDays, addWeeks, addMonths, addYears, addHours, addMinutes, addQuarters,
  differenceInMilliseconds, isWeekend, isSameDay
} from 'date-fns';
import { GanttColumnModel, GanttHeaderRow, ViewScale, GanttColumnHeaderModel } from './gantt.models';
import { formatHeaderDate, getDefaultHeaderFormat } from './gantt-utils';

/**
 * Generate columns for a given date range and scale.
 */
export function generateColumns(
  from: Date,
  to: Date,
  viewScale: ViewScale,
  columnWidth: number = 50
): GanttColumnModel[] {
  const columns: GanttColumnModel[] = [];
  let currentDate = getStartOfScale(from, viewScale);
  const endDate = getEndOfScale(to, viewScale);
  let left = 0;

  const now = new Date();

  while (currentDate < endDate) {
    const endOfCurrent = getNextOfScale(currentDate, viewScale);
    const duration = differenceInMilliseconds(endOfCurrent, currentDate);
    
    columns.push({
      date: currentDate,
      endDate: endOfCurrent,
      left: left,
      width: columnWidth,
      duration: duration,
      isWeekend: isWeekend(currentDate),
      isCurrent: isSameDay(currentDate, now) // naive check, real check could be more robust based on scale
    });

    left += columnWidth;
    currentDate = endOfCurrent;
  }

  return columns;
}

/**
 * Generate headers grouped by scale for a set of columns.
 */
export function generateHeaders(
  columns: GanttColumnModel[],
  headerScales: string[],
  headerFormats: Record<string, string> | undefined
): GanttHeaderRow[] {
  const headers: GanttHeaderRow[] = [];

  for (const scale of headerScales) {
    const row: GanttHeaderRow = { headers: [] };
    let currentHeader: GanttColumnHeaderModel | null = null;
    const format = headerFormats?.[scale] || getDefaultHeaderFormat(scale);

    for (const column of columns) {
      const start = getStartOfScaleString(column.date, scale as ViewScale);
      const label = formatHeaderDate(start, format, scale as ViewScale);

      if (!currentHeader || currentHeader.label !== label) {
        currentHeader = {
          date: start,
          endDate: getNextOfScale(start, scale as ViewScale),
          left: column.left,
          width: column.width,
          label: label
        };
        row.headers.push(currentHeader);
      } else {
        currentHeader.width += column.width;
        currentHeader.endDate = column.endDate; // Update to cover this column
      }
    }
    headers.push(row);
  }

  return headers;
}

/**
 * Updates positions (left, width) if they change externally.
 */
export function updateColumnPositions(columns: GanttColumnModel[], startLeft: number = 0): void {
  let left = startLeft;
  for (const col of columns) {
    col.left = left;
    left += col.width;
  }
}

// Internal Helpers

function getStartOfScale(date: Date, scale: ViewScale): Date {
  switch (scale) {
    case 'year': return startOfYear(date);
    case 'quarter': return startOfQuarter(date);
    case 'month': return startOfMonth(date);
    case 'week': return startOfWeek(date);
    case 'day': return startOfDay(date);
    case 'hour': return startOfHour(date);
    case 'minute': return startOfMinute(date);
    default: return startOfDay(date);
  }
}

function getStartOfScaleString(date: Date, scale: string): Date {
  return getStartOfScale(date, scale as ViewScale);
}

function getEndOfScale(date: Date, scale: ViewScale): Date {
  switch (scale) {
    case 'year': return endOfYear(date);
    case 'quarter': return endOfQuarter(date);
    case 'month': return endOfMonth(date);
    case 'week': return endOfWeek(date);
    case 'day': return endOfDay(date);
    case 'hour': return endOfHour(date);
    case 'minute': return endOfMinute(date);
    default: return endOfDay(date);
  }
}

function getNextOfScale(date: Date, scale: ViewScale): Date {
  switch (scale) {
    case 'year': return addYears(date, 1);
    case 'quarter': return addQuarters(date, 1);
    case 'month': return addMonths(date, 1);
    case 'week': return addWeeks(date, 1);
    case 'day': return addDays(date, 1);
    case 'hour': return addHours(date, 1);
    case 'minute': return addMinutes(date, 1);
    default: return addDays(date, 1);
  }
}
