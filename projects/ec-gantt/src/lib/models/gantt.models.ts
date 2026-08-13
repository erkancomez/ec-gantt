import { TemplateRef } from '@angular/core';

export type ViewScale = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute';
export type CurrentDateMode = 'none' | 'line' | 'column';
export type SortMode = 'disabled' | 'name' | 'from' | 'to';
export type SideMode = 'Tree' | 'Table' | 'TreeTable' | 'Disabled';

export interface GanttColumnModel {
  date: Date;
  endDate: Date;
  left: number;
  width: number;
  duration: number;
  isWeekend: boolean;
  isCurrent: boolean;
}

export interface GanttColumnHeaderModel {
  date: Date;
  endDate: Date;
  left: number;
  width: number;
  label: string;
}

export interface GanttHeaderRow {
  headers: GanttColumnHeaderModel[];
}

export interface GanttTimespan {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  classes?: string;
}

export interface ComputedGanttTimespan extends GanttTimespan {
  left: number;
  width: number;
}

export interface GanttTaskDependency {
  fromId: string | number;
  toId: string | number;
  color?: string;
}

export interface GanttMovableOptions {
  allowMoving?: boolean | ((task: GanttTask) => boolean);
  allowResizing?: boolean | ((task: GanttTask) => boolean);
  allowRowSwitching?: boolean | ((task: GanttTask, targetRow: GanttRow) => boolean);
}

export interface GanttConfig {
  startDate?: Date;
  endDate?: Date;
  viewScale: ViewScale;
  columnWidth: number;
  rowHeight: number;
  taskHeight?: number;
  headerHeight: number;
  sideWidth: number;
  height?: number | string;
  width?: number | string;
  sideMode: SideMode;
  showSide: boolean;
  allowSideResizing: boolean;
  currentDate: CurrentDateMode;
  currentDateValue: Date;
  sortMode: SortMode;
  filterTask: string;
  filterRow: string;
  taskOutOfRange: 'truncate' | 'expand';
  headerScales?: string[];
  headerFormats?: Record<string, string>;
  magnet?: boolean; // Snap to grid columns
  magnetMode?: 'daily' | 'timeframes' | 'none';
  drawTask?: boolean | ((event: MouseEvent) => boolean); // Enable click-drag task creation
  drawTaskFactory?: (event: MouseEvent, row: GanttRow) => Partial<GanttTask>; // Factory method for creating new task
  movable?: boolean | ((event: MouseEvent) => boolean) | GanttMovableOptions; // Movable options, boolean shortcut, or function filter
  allowMoving?: boolean | ((task: GanttTask) => boolean);
  allowResizing?: boolean | ((task: GanttTask) => boolean);
  allowRowSwitching?: boolean | ((task: GanttTask, targetRow: GanttRow) => boolean);
  readOnly?: boolean;
  stepUnit?: string;
  groupDisplayMode?: 'group' | 'overview' | 'promoted' | 'disabled';
  zoom?: number;
  workingMode?: 'visible' | 'hidden' | 'background';
  nonWorkingMode?: 'visible' | 'hidden' | 'cropped';
  dependenciesEnabled?: boolean;
  dependenciesConflicts?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  taskOverlapMode?: 'cascade' | 'underneath';
  rowContentEnabled?: boolean;
  taskContentEnabled?: boolean;
}

export interface GanttTaskProgress {
  percent: number;
  color?: string;
}

export interface GanttTaskBounds {
  est?: Date; // Estimated Start Date
  lct?: Date; // Latest Completion Time
}

export interface GanttTaskSection {
  name?: string;
  startDate: Date | string;
  endDate: Date | string;
  color?: string;
  classes?: string | string[];
}

export interface ComputedGanttTaskSection {
  name?: string;
  left: number;
  width: number;
  color?: string;
  classes?: string;
}

export interface GanttTask {
  id: string | number;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  progress?: number | GanttTaskProgress;
  color?: string;
  priority?: number;
  content?: string | TemplateRef<any>;
  contentTemplate?: TemplateRef<any>;
  sections?: { items: GanttTaskSection[] } | GanttTaskSection[];
  dependencies?: (string | number | { to: string | number })[];
  bounds?: GanttTaskBounds;
  label?: string;
  height?: number;
  width?: number;
  data?: any;
  [key: string]: any;
}

export interface GanttRow {
  id: string | number;
  name: string;
  tasks: GanttTask[];
  content?: string | TemplateRef<any>;
  contentTemplate?: TemplateRef<any>;
  height?: number;
  color?: string;
  classes?: string;
  parent?: string | number;
  children?: (string | number)[];
  expanded?: boolean;
  level?: number;
  isGroup?: boolean;
  [key: string]: any;
}

export interface ComputedGanttRow extends GanttRow {
  computedTasks: ComputedGanttTask[];
  level: number;
  hasChildren: boolean;
  isVisible: boolean;
  minDate?: Date | null;
  maxDate?: Date | null;
}

export interface ComputedGanttTask extends GanttTask {
  startDate: Date;
  endDate: Date;
  left: number;
  width: number;
  isMilestone: boolean;
  isGroup?: boolean;
  isOverview?: boolean;
  isPromoted?: boolean;
  progressPercent: number;
  progressColor?: string;
  rowIndex: number;
  subRowIndex?: number;
  totalSubRows?: number;
  boundsLeft?: number;
  boundsWidth?: number;
  isOverlapping?: boolean;
  computedSections?: ComputedGanttTaskSection[];
}

export interface GanttDependencyLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fromSide?: 'left' | 'right';
  toSide?: 'left' | 'right';
  color?: string;
  isConflict?: boolean;
  fromTaskId?: string | number;
  toTaskId?: string | number;
}
