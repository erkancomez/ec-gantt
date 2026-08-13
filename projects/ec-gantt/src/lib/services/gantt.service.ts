import { Injectable, computed, signal } from '@angular/core';
import {
  GanttConfig, GanttRow, ComputedGanttRow, GanttColumnModel, GanttHeaderRow,
  GanttTask, ComputedGanttTask, ComputedGanttTaskSection, GanttTimespan, ComputedGanttTimespan, GanttDependencyLine
} from '../models/gantt.models';
import { generateColumns, generateHeaders } from '../models/column-generator';
import { getDefaultHeaders } from '../models/gantt-utils';
import { differenceInMilliseconds } from 'date-fns';

import { GanttApi } from './gantt-api';

function parseTaskDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class GanttService {
  api = new GanttApi(this);
  config = signal<GanttConfig>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1, 0, 0, 0),
    viewScale: 'day',
    columnWidth: 55,
    rowHeight: 38,
    headerHeight: 40,
    sideWidth: 260,
    sideMode: 'TreeTable',
    showSide: true,
    allowSideResizing: true,
    currentDate: 'line',
    currentDateValue: new Date(),
    sortMode: 'disabled',
    filterTask: '',
    filterRow: '',
    taskOutOfRange: 'truncate',
    readOnly: false,
    drawTask: true,
    magnet: true,
    magnetMode: 'daily',
    stepUnit: '1 day',
    workingMode: 'visible',
    nonWorkingMode: 'visible',
    dependenciesEnabled: true,
    dependenciesConflicts: true,
    groupDisplayMode: 'group',
    zoom: 1,
    rowContentEnabled: false,
    taskContentEnabled: false,
  });

  rows = signal<GanttRow[]>([]);
  timespans = signal<GanttTimespan[]>([]);
  expandedRows = signal<Record<string | number, boolean>>({});

  containerWidth = signal<number>(0);

  // Selected State for Inspector
  selectedTaskId = signal<string | number | null>('sp1');
  selectedRowId = signal<string | number | null>('sprint-1');

  selectTask(taskId: string | number, rowId?: string | number) {
    this.selectedTaskId.set(taskId);
    if (rowId) this.selectedRowId.set(rowId);
  }

  selectRow(rowId: string | number) {
    this.selectedRowId.set(rowId);
  }

  // Interactive Linking State
  linkingSource = signal<{ task: ComputedGanttTask; x: number; y: number; side?: 'left' | 'right' } | null>(null);
  linkingCurrentPos = signal<{ x: number; y: number } | null>(null);

  effectiveDateRange = computed<{ startDate: Date; endDate: Date }>(() => {
    const c = this.config();
    let start = c.startDate;
    let end = c.endDate;

    if (!start || !end) {
      let minTime: number | null = null;
      let maxTime: number | null = null;

      this.rows().forEach(r => {
        (r.tasks || []).forEach(t => {
          const s = parseTaskDate(t.startDate);
          const e = parseTaskDate(t.endDate);
          if (s) {
            const st = s.getTime();
            if (minTime === null || st < minTime) minTime = st;
          }
          if (e) {
            const et = e.getTime();
            if (maxTime === null || et > maxTime) maxTime = et;
          }
        });
      });

      if (minTime !== null && maxTime !== null) {
        const dMin = new Date(minTime);
        const dMax = new Date(maxTime);
        start = start || new Date(dMin.getFullYear(), dMin.getMonth(), dMin.getDate() - 1);
        end = end || new Date(dMax.getFullYear(), dMax.getMonth(), dMax.getDate() + 2);
      } else {
        const now = new Date();
        start = start || new Date(now.getFullYear(), now.getMonth(), 1);
        end = end || new Date(now.getFullYear(), now.getMonth() + 2, 1);
      }
    }

    return { startDate: start, endDate: end };
  });

  columns = computed<GanttColumnModel[]>(() => {
    const c = this.config();
    const range = this.effectiveDateRange();
    const zoomFactor = c.zoom || 1;
    const baseWidth = Math.max(20, Math.round(c.columnWidth * zoomFactor));
    
    let rawCols = generateColumns(range.startDate, range.endDate, c.viewScale, baseWidth);

    // Non-working mode filtering
    if (c.nonWorkingMode === 'hidden' || c.nonWorkingMode === 'cropped') {
      rawCols = rawCols.filter(col => !col.isWeekend);
    }

    // Auto-stretch columns to fill container width when total columns width is smaller than container
    const targetWidth = this.containerWidth();
    if (rawCols.length > 0) {
      const initialTotalWidth = rawCols.reduce((sum, col) => sum + col.width, 0);
      if (targetWidth > initialTotalWidth && initialTotalWidth > 0) {
        const scaleFactor = targetWidth / initialTotalWidth;
        let currentLeft = 0;
        rawCols.forEach((col, idx) => {
          col.left = currentLeft;
          if (idx === rawCols.length - 1) {
            col.width = Math.max(baseWidth, targetWidth - currentLeft);
          } else {
            col.width = Math.round(col.width * scaleFactor);
          }
          currentLeft += col.width;
        });
      } else {
        let currentLeft = 0;
        rawCols.forEach(col => {
          col.left = currentLeft;
          currentLeft += col.width;
        });
      }
    }

    return rawCols;
  });

  headers = computed<GanttHeaderRow[]>(() => {
    const c = this.config();
    const cols = this.columns();
    const scales = c.headerScales || getDefaultHeaders(c.viewScale);
    return generateHeaders(cols, scales, c.headerFormats);
  });

  totalWidth = computed(() => {
    const cols = this.columns();
    const colsWidth = cols.length > 0 ? cols[cols.length - 1].left + cols[cols.length - 1].width : 0;
    return Math.max(colsWidth, this.containerWidth());
  });

  computedTimespans = computed<ComputedGanttTimespan[]>(() => {
    const ts = this.timespans();
    return ts.map(t => {
      const left = this.getPositionByDate(t.startDate);
      const right = this.getPositionByDate(t.endDate);
      return {
        ...t,
        left,
        width: Math.max(right - left, 1),
      };
    });
  });

  computedRows = computed<ComputedGanttRow[]>(() => {
    const c = this.config();
    let rawRows = this.rows();
    const expandedMap = this.expandedRows();

    // Map parent-child hierarchy
    const rowMap = new Map<string | number, GanttRow>();
    rawRows.forEach(r => rowMap.set(r.id, r));

    // Sort rows
    if (c.sortMode && c.sortMode !== 'disabled') {
      rawRows = [...rawRows].sort((a, b) => {
        if (c.sortMode === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (c.sortMode === 'from') {
          const aMin = this.getMinDate(a);
          const bMin = this.getMinDate(b);
          if (!aMin) return 1;
          if (!bMin) return -1;
          return aMin.getTime() - bMin.getTime();
        }
        if (c.sortMode === 'to') {
          const aMax = this.getMaxDate(a);
          const bMax = this.getMaxDate(b);
          if (!aMax) return 1;
          if (!bMax) return -1;
          return aMax.getTime() - bMax.getTime();
        }
        return 0;
      });
    }

    const visibleRows: ComputedGanttRow[] = [];

    const processRowTree = (r: GanttRow, level: number, parentVisible: boolean) => {
      const isExpanded = expandedMap[r.id] !== undefined ? expandedMap[r.id] : (r.expanded !== false);
      const children = rawRows.filter(child => child.parent === r.name || child.parent === r.id);
      const hasChildren = (r.children && r.children.length > 0) || children.length > 0;
      
      const minDate = this.getMinDate(r);
      const maxDate = this.getMaxDate(r);

      let tasks = r.tasks || [];
      if (c.filterTask && c.filterTask.trim() !== '') {
        const query = c.filterTask.toLowerCase();
        tasks = tasks.filter(t => t.name.toLowerCase().includes(query));
      }

      const computedTasks: ComputedGanttTask[] = tasks.map(task => {
        const sDate = parseTaskDate(task.startDate) || new Date();
        const eDate = parseTaskDate(task.endDate) || new Date(sDate.getTime() + 86400000);

        const est = parseTaskDate(task.bounds?.est);
        const lct = parseTaskDate(task.bounds?.lct);

        const left = this.getPositionByDate(sDate);
        const right = this.getPositionByDate(eDate);
        const isMilestone = sDate.getTime() === eDate.getTime();

        let progressPercent = 0;
        let progressColor: string = 'rgba(0, 0, 0, 0.28)';
        if (typeof task.progress === 'number') {
          progressPercent = task.progress;
        } else if (task.progress && typeof task.progress === 'object') {
          progressPercent = task.progress.percent;
          if (task.progress.color) progressColor = task.progress.color;
        }

        let boundsLeft: number | undefined;
        let boundsWidth: number | undefined;
        if (est && lct) {
          boundsLeft = this.getPositionByDate(est);
          const boundsRight = this.getPositionByDate(lct);
          boundsWidth = Math.max(boundsRight - boundsLeft, 4);
        }

        const calcWidth = isMilestone ? 16 : Math.max(right - left, 12);
        const finalWidth = task.width !== undefined ? task.width : calcWidth;
        const finalHeight = task.height !== undefined ? task.height : (c.taskHeight || 24);

        const rawSections = Array.isArray(task.sections) ? task.sections : (task.sections?.items || []);
        const computedSections: ComputedGanttTaskSection[] = rawSections.map((sec, idx) => {
          const secFrom = parseTaskDate(sec.startDate) || sDate;
          const secTo = parseTaskDate(sec.endDate) || eDate;
          const secLeft = Math.max(0, this.getPositionByDate(secFrom) - left);
          const secRight = Math.max(secLeft, this.getPositionByDate(secTo) - left);
          const defaultPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
          const color = sec.color || defaultPalette[idx % defaultPalette.length];
          const classesStr = Array.isArray(sec.classes) ? sec.classes.join(' ') : (sec.classes || '');
          return {
            name: sec.name,
            left: secLeft,
            width: Math.max(secRight - secLeft, 2),
            color,
            classes: classesStr,
          };
        });

        return {
          ...task,
          startDate: sDate,
          endDate: eDate,
          bounds: est && lct ? { est, lct } : task.bounds,
          left,
          width: finalWidth,
          height: finalHeight,
          isMilestone,
          progressPercent,
          progressColor,
          rowIndex: visibleRows.length,
          boundsLeft,
          boundsWidth,
          computedSections,
        };
      });

      if (c.taskOverlapMode === 'underneath') {
        computedTasks.forEach(t => {
          t.subRowIndex = 0;
          t.totalSubRows = 1;
        });
      } else if (computedTasks.length > 1) {
        const getEffectiveStart = (t: ComputedGanttTask) => {
          return t.bounds?.est ? Math.min(t.startDate.getTime(), t.bounds.est.getTime()) : t.startDate.getTime();
        };

        const getEffectiveEnd = (t: ComputedGanttTask) => {
          return t.bounds?.lct ? Math.max(t.endDate.getTime(), t.bounds.lct.getTime()) : t.endDate.getTime();
        };

        const sorted = [...computedTasks].sort((a, b) => getEffectiveStart(a) - getEffectiveStart(b));
        const lanes: Date[] = [];
        sorted.forEach(t => {
          const tStart = new Date(getEffectiveStart(t));
          const tEnd = new Date(getEffectiveEnd(t));

          let laneIndex = lanes.findIndex(end => end.getTime() <= tStart.getTime());
          if (laneIndex === -1) {
            laneIndex = lanes.length;
            lanes.push(tEnd);
          } else {
            lanes[laneIndex] = tEnd;
          }
          t.subRowIndex = laneIndex;
        });
        const totalLanes = lanes.length;
        computedTasks.forEach(t => {
          t.totalSubRows = totalLanes;
        });
      } else if (computedTasks.length === 1) {
        computedTasks[0].subRowIndex = 0;
        computedTasks[0].totalSubRows = 1;
      }

      if (computedTasks.length > 1) {
        computedTasks.forEach(task => {
          if (task.isGroup || task.isOverview || task.isPromoted) return;
          const taskStart = task.bounds?.est ? Math.min(task.startDate.getTime(), task.bounds.est.getTime()) : task.startDate.getTime();
          const taskEnd = task.bounds?.lct ? Math.max(task.endDate.getTime(), task.bounds.lct.getTime()) : task.endDate.getTime();

          const overlaps = computedTasks.some(other => {
            if (other.id === task.id || other.isGroup || other.isOverview || other.isPromoted) return false;
            const otherStart = other.bounds?.est ? Math.min(other.startDate.getTime(), other.bounds.est.getTime()) : other.startDate.getTime();
            const otherEnd = other.bounds?.lct ? Math.max(other.endDate.getTime(), other.bounds.lct.getTime()) : other.endDate.getTime();

            return taskStart < otherEnd && taskEnd > otherStart;
          });
          task.isOverlapping = overlaps;
        });
      }

      const groupMode = c.groupDisplayMode || 'group';

      if ((hasChildren || r.isGroup) && minDate && maxDate && groupMode !== 'disabled') {
        if (groupMode === 'group') {
          const gLeft = this.getPositionByDate(minDate);
          const gRight = this.getPositionByDate(maxDate);
          computedTasks.push({
            id: `group-bar-${r.id}`,
            name: r.name,
            startDate: minDate,
            endDate: maxDate,
            left: gLeft,
            width: Math.max(gRight - gLeft, 12),
            height: 12,
            isGroup: true,
            isMilestone: false,
            progressPercent: 0,
            rowIndex: visibleRows.length,
            subRowIndex: 0,
            totalSubRows: 1,
            color: r.color || '#45607D',
          });
        } else if (groupMode === 'overview') {
          const childTasks = this.getRowAllTasks(r);
          childTasks.forEach(ct => {
            const s = parseTaskDate(ct.startDate) || new Date();
            const e = parseTaskDate(ct.endDate) || new Date(s.getTime() + 86400000);
            const left = this.getPositionByDate(s);
            const right = this.getPositionByDate(e);
            computedTasks.push({
              ...ct,
              startDate: s,
              endDate: e,
              left,
              width: Math.max(right - left, 8),
              isMilestone: s.getTime() === e.getTime(),
              isOverview: true,
              progressPercent: 0,
              rowIndex: visibleRows.length,
              subRowIndex: 0,
              totalSubRows: 1,
            });
          });
        } else if (groupMode === 'promoted') {
          if (!isExpanded) {
            const childTasks = this.getRowAllTasks(r);
            childTasks.forEach(ct => {
              const s = parseTaskDate(ct.startDate) || new Date();
              const e = parseTaskDate(ct.endDate) || new Date(s.getTime() + 86400000);
              const left = this.getPositionByDate(s);
              const right = this.getPositionByDate(e);
              computedTasks.push({
                ...ct,
                startDate: s,
                endDate: e,
                left,
                width: Math.max(right - left, 12),
                isMilestone: s.getTime() === e.getTime(),
                isPromoted: true,
                progressPercent: typeof ct.progress === 'number' ? ct.progress : (ct.progress?.percent || 0),
                rowIndex: visibleRows.length,
                subRowIndex: 0,
                totalSubRows: 1,
              });
            });
          }
        }
      }

      // Dynamic Row Height based on total overlapping task lanes
      const baseHeight = r.height || c.rowHeight;
      const maxLanes = Math.max(...computedTasks.map(t => (t.subRowIndex || 0) + 1), 1);
      const computedHeight = maxLanes > 1 ? baseHeight + (maxLanes - 1) * 28 : baseHeight;

      const compRow: ComputedGanttRow = {
        ...r,
        height: computedHeight,
        level,
        hasChildren,
        expanded: isExpanded,
        isVisible: parentVisible,
        minDate,
        maxDate,
        computedTasks,
      };

      if (parentVisible) {
        visibleRows.push(compRow);
      }

      if (children.length > 0) {
        const childrenVisible = parentVisible && isExpanded;
        children.forEach(child => {
          processRowTree(child, level + 1, childrenVisible);
        });
      }
    };

    const rootRows = rawRows.filter(r => !r.parent || !rawRows.some(p => p.id === r.parent || p.name === r.parent));

    if (rootRows.length > 0) {
      rootRows.forEach(root => {
        processRowTree(root, 0, true);
      });
    } else {
      rawRows.forEach(r => processRowTree(r, 0, true));
    }

    return visibleRows;
  });

  totalBodyHeight = computed<number>(() => {
    const rows = this.computedRows();
    const defaultH = this.config().rowHeight;
    return rows.reduce((sum, r) => sum + (r.height || defaultH), 0) || 500;
  });

  computedDependencies = computed<GanttDependencyLine[]>(() => {
    if (this.config().dependenciesEnabled === false) return [];
    const rows = this.computedRows();
    const taskPosMap = new Map<string | number, { x: number; y: number; width: number; task: ComputedGanttTask }>();
    const defaultRowHeight = this.config().rowHeight;

    let currentY = 0;
    rows.forEach((row) => {
      const h = row.height || defaultRowHeight;
      row.computedTasks.forEach((task: ComputedGanttTask) => {
        const subIdx = task.subRowIndex || 0;
        const taskH = task.height || 24;
        const pad = Math.max((defaultRowHeight - taskH) / 2, 2);
        const taskCenterY = currentY + pad + (taskH / 2) + (subIdx * (taskH + 4));
        taskPosMap.set(task.id, {
          x: task.left,
          y: taskCenterY,
          width: task.width,
          task,
        });
      });
      currentY += h;
    });

    const lines: GanttDependencyLine[] = [];

    rows.forEach((row) => {
      row.computedTasks.forEach((task: ComputedGanttTask) => {
        if (task.dependencies) {
          task.dependencies.forEach((dep: any) => {
            const targetId = typeof dep === 'object' ? dep.to : dep;
            if (targetId && taskPosMap.has(task.id) && taskPosMap.has(targetId)) {
              const source = taskPosMap.get(task.id)!;
              const target = taskPosMap.get(targetId)!;

              const fromSide: 'left' | 'right' = (typeof dep === 'object' && dep.fromSide) ? dep.fromSide : 'right';
              const toSide: 'left' | 'right' = (typeof dep === 'object' && dep.toSide) ? dep.toSide : 'left';

              const x1 = fromSide === 'left'
                ? (source.task.isMilestone ? source.x - 8 : source.x)
                : (source.task.isMilestone ? source.x + 8 : source.x + source.width);

              const x2 = toSide === 'left'
                ? (target.task.isMilestone ? target.x - 8 : target.x)
                : (target.task.isMilestone ? target.x + 8 : target.x + target.width);

              // Conflict check: Target task starts BEFORE source task ends!
              const isConflict = target.task.startDate.getTime() < source.task.endDate.getTime();

              lines.push({
                id: `${task.id}->${targetId}`,
                x1,
                y1: source.y,
                x2,
                y2: target.y,
                fromSide,
                toSide,
                isConflict,
                fromTaskId: task.id,
                toTaskId: targetId,
              });
            }
          });
        }
      });
    });

    return lines;
  });

  currentDatePosition = computed(() => {
    const c = this.config();
    if (c.currentDate === 'none') return -1;
    return this.getPositionByDate(c.currentDateValue);
  });

  currentDateColumn = computed(() => {
    const c = this.config();
    if (c.currentDate !== 'column') return null;
    const cols = this.columns();
    const val = c.currentDateValue.getTime();
    return cols.find(col => val >= col.date.getTime() && val <= col.endDate.getTime()) || (cols.length ? cols[Math.floor(cols.length / 2)] : null);
  });

  // --- DYNAMIC TASK DATE UPDATES (DRAG / RESIZE) ---

  private lastExpandTime = 0;

  updateTaskDates(
    taskId: string | number,
    newStartDate: Date,
    newEndDate: Date,
    options?: { mode?: 'move' | 'resize-left' | 'resize-right' }
  ) {
    const c = this.config();

    // Ensure start date is always <= end date (handle handle crossover / flip)
    if (newStartDate.getTime() > newEndDate.getTime()) {
      const temp = newStartDate;
      newStartDate = newEndDate;
      newEndDate = temp;
    }

    // Apply magnet snapping if active
    if (c.magnet !== false && c.magnetMode !== 'none') {
      if (options?.mode === 'move') {
        const duration = newEndDate.getTime() - newStartDate.getTime();
        newStartDate = this.snapDate(newStartDate, taskId);
        newEndDate = new Date(newStartDate.getTime() + duration);
      } else if (options?.mode === 'resize-left') {
        newStartDate = this.snapDate(newStartDate, taskId);
      } else if (options?.mode === 'resize-right') {
        newEndDate = this.snapDate(newEndDate, taskId);
      } else {
        newStartDate = this.snapDate(newStartDate, taskId);
        newEndDate = this.snapDate(newEndDate, taskId);
      }
    }

    // Re-check start <= end after snapping
    if (newStartDate.getTime() > newEndDate.getTime()) {
      const temp = newStartDate;
      newStartDate = newEndDate;
      newEndDate = temp;
    }

    const range = this.effectiveDateRange();
    let needConfigUpdate = false;
    let newChartStart = range.startDate;
    let newChartEnd = range.endDate;

    const taskOutOfRange = c.taskOutOfRange || 'truncate';
    let expandLeft = taskOutOfRange === 'expand';
    let expandRight = taskOutOfRange === 'expand';

    const cols = this.columns();

    // Handle Left Expansion or Clamping
    if (newStartDate.getTime() < range.startDate.getTime()) {
      if (expandLeft) {
        const diffMs = range.startDate.getTime() - newStartDate.getTime();
        const colDuration = cols[0]?.duration || 86400000;
        const expandDays = Math.ceil(diffMs / colDuration) || 1;
        newChartStart = new Date(range.startDate.getTime() - (expandDays * colDuration));
        needConfigUpdate = true;
      } else {
        // Clamp to start date if expansion is disabled for left
        newStartDate = new Date(range.startDate.getTime());
        if (options?.mode === 'move') {
          const duration = newEndDate.getTime() - newStartDate.getTime();
          newEndDate = new Date(newStartDate.getTime() + duration);
        }
      }
    }

    // Handle Right Expansion or Clamping
    if (newEndDate.getTime() > range.endDate.getTime()) {
      if (expandRight) {
        const diffMs = newEndDate.getTime() - range.endDate.getTime();
        const colDuration = cols[cols.length - 1]?.duration || 86400000;
        const expandDays = Math.ceil(diffMs / colDuration) || 1;
        newChartEnd = new Date(range.endDate.getTime() + (expandDays * colDuration));
        needConfigUpdate = true;
      } else {
        // Clamp to end date if expansion is disabled for right
        newEndDate = new Date(range.endDate.getTime());
        if (options?.mode === 'move') {
          const duration = newEndDate.getTime() - newStartDate.getTime();
          if (newStartDate.getTime() > newEndDate.getTime() - duration) {
            newStartDate = new Date(Math.max(range.startDate.getTime(), newEndDate.getTime() - duration));
          }
        }
      }
    }

    if (needConfigUpdate) {
      this.config.update(old => ({
        ...old,
        startDate: newChartStart,
        endDate: newChartEnd,
      }));
    }

    this.rows.update(currentRows => {
      return currentRows.map(row => {
        const hasTask = (row.tasks || []).some(t => t.id === taskId);
        if (!hasTask) return row;

        const updatedTasks = row.tasks.map(task => {
          if (task.id !== taskId) return task;

          const oldS = parseTaskDate(task.startDate) || newStartDate;
          const oldE = parseTaskDate(task.endDate) || newEndDate;
          const oldDuration = Math.max(oldE.getTime() - oldS.getTime(), 1);
          const newDuration = Math.max(newEndDate.getTime() - newStartDate.getTime(), 1);
          const deltaMs = newStartDate.getTime() - oldS.getTime();

          let updatedSections = task.sections;
          if (task.sections) {
            const rawSections = Array.isArray(task.sections) ? task.sections : (task.sections.items || []);
            const shifted = rawSections.map(sec => {
              const secS = parseTaskDate(sec.startDate) || oldS;
              const secE = parseTaskDate(sec.endDate) || oldE;

              let newSecS: Date;
              let newSecE: Date;

              if (options?.mode === 'move') {
                newSecS = new Date(secS.getTime() + deltaMs);
                newSecE = new Date(secE.getTime() + deltaMs);
              } else {
                // Proportional scale on resize
                const rStart = (secS.getTime() - oldS.getTime()) / oldDuration;
                const rEnd = (secE.getTime() - oldS.getTime()) / oldDuration;
                newSecS = new Date(newStartDate.getTime() + (rStart * newDuration));
                newSecE = new Date(newStartDate.getTime() + (rEnd * newDuration));
              }

              return {
                ...sec,
                startDate: newSecS,
                endDate: newSecE,
              };
            });

            updatedSections = Array.isArray(task.sections) ? shifted : { ...task.sections, items: shifted };
          }

          const updatedModel = {
            ...task,
            startDate: newStartDate,
            endDate: newEndDate,
            sections: updatedSections,
          };
          this.api.tasks.raiseChange(updatedModel);
          if (options?.mode === 'move') {
            this.api.tasks.raiseMove(updatedModel);
          }
          return updatedModel;
        });

        return { ...row, tasks: updatedTasks };
      });
    });
  }

  // --- DRAW TASK FEATURE ---

  addTaskToRow(rowId: string | number, task: GanttTask) {
    this.rows.update(currentRows => {
      return currentRows.map(r => {
        if (r.id === rowId || String(r.id) === String(rowId)) {
          return { ...r, tasks: [...(r.tasks || []), task] };
        }
        return r;
      });
    });
    this.api.tasks.raiseAdd(task);
  }

  // --- ROW SWITCHING ---

  moveTaskToRow(taskId: string | number, targetRowId: string | number) {
    let movedTask: GanttTask | null = null;
    let oldRowObj: GanttRow | undefined;
    let newRowObj: GanttRow | undefined;

    const current = this.rows();
    oldRowObj = current.find(r => (r.tasks || []).some(t => String(t.id) === String(taskId)));
    newRowObj = current.find(r => String(r.id) === String(targetRowId));

    this.rows.update(currentRows => {
      // Remove task from source row
      const cleaned = currentRows.map(row => {
        const found = (row.tasks || []).find(t => String(t.id) === String(taskId));
        if (found) {
          movedTask = found;
          return { ...row, tasks: row.tasks.filter(t => String(t.id) !== String(taskId)) };
        }
        return row;
      });

      // Add to target row
      if (movedTask) {
        return cleaned.map(row => {
          if (String(row.id) === String(targetRowId)) {
            return { ...row, tasks: [...(row.tasks || []), movedTask!] };
          }
          return row;
        });
      }
      return cleaned;
    });

    if (movedTask) {
      this.api.tasks.raiseRowChange({ task: movedTask, oldRow: oldRowObj, newRow: newRowObj });
    }
  }

  // --- ROW REORDERING (SORTABLE ROWS) ---

  reorderRows(sourceRowId: string | number, targetRowId: string | number) {
    if (sourceRowId === targetRowId) return;
    let movedRowObj: GanttRow | undefined;
    let srcIndex = -1;
    let targetIndex = -1;

    this.rows.update(currentRows => {
      srcIndex = currentRows.findIndex(r => r.id === sourceRowId || String(r.id) === String(sourceRowId));
      targetIndex = currentRows.findIndex(r => r.id === targetRowId || String(r.id) === String(targetRowId));
      if (srcIndex === -1 || targetIndex === -1) return currentRows;

      const updated = [...currentRows];
      const [moved] = updated.splice(srcIndex, 1);
      movedRowObj = moved;
      updated.splice(targetIndex, 0, moved);
      return updated;
    });

    if (movedRowObj && srcIndex !== -1 && targetIndex !== -1) {
      this.api.rows.raiseMove({ row: movedRowObj, oldIndex: srcIndex, newIndex: targetIndex });
    }
  }

  // --- INTERACTIVE LINKING METHODS ---

  startLinking(task: ComputedGanttTask, startX: number, startY: number, side: 'left' | 'right' = 'right') {
    this.linkingSource.set({ task, x: startX, y: startY, side });
    this.linkingCurrentPos.set({ x: startX, y: startY });
  }

  updateLinkingPos(x: number, y: number) {
    if (this.linkingSource()) {
      this.linkingCurrentPos.set({ x, y });
    }
  }

  completeLinking(
    targetTask: ComputedGanttTask,
    fromSide: 'left' | 'right' = 'right',
    toSide: 'left' | 'right' = 'left'
  ) {
    const src = this.linkingSource();
    if (src && src.task.id !== targetTask.id) {
      const fromId = src.task.id;
      const toId = targetTask.id;

      if (this.hasCircularDependency(fromId, toId)) {
        alert(`Hata: Döngüsel bağımlılık (circular dependency) oluşturulamaz.`);
      } else {
        this.addDependency(fromId, toId, fromSide, toSide);
      }
    }
    this.cancelLinking();
  }

  // Circular dependency conflict checker
  private hasCircularDependency(sourceId: string | number, targetId: string | number): boolean {
    const visited = new Set<string | number>();
    const stack = [targetId];

    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (curr === sourceId) return true;
      if (!visited.has(curr)) {
        visited.add(curr);
        // Find tasks that curr depends on
        const allTasks = this.rows().flatMap(r => r.tasks || []);
        const taskObj = allTasks.find(t => t.id === curr);
        if (taskObj?.dependencies) {
          taskObj.dependencies.forEach(d => {
            const nextId = typeof d === 'object' ? d.to : d;
            if (nextId) stack.push(nextId);
          });
        }
      }
    }
    return false;
  }

  cancelLinking() {
    this.linkingSource.set(null);
    this.linkingCurrentPos.set(null);
  }

  addDependency(
    sourceTaskId: string | number,
    targetTaskId: string | number,
    fromSide: 'left' | 'right' = 'right',
    toSide: 'left' | 'right' = 'left'
  ) {
    this.rows.update(currentRows => {
      return currentRows.map(row => {
        const hasSource = (row.tasks || []).some(t => String(t.id) === String(sourceTaskId));
        if (!hasSource) return row;

        const updatedTasks = row.tasks.map(task => {
          if (String(task.id) !== String(sourceTaskId)) return task;
          const deps = task.dependencies || [];
          const exists = deps.some(d => String(typeof d === 'object' ? d.to : d) === String(targetTaskId));
          if (exists) {
            const updatedDeps = deps.map(d => {
              const depTo = typeof d === 'object' ? d.to : d;
              if (String(depTo) === String(targetTaskId)) {
                return { to: targetTaskId, fromSide, toSide };
              }
              return d;
            });
            return { ...task, dependencies: updatedDeps };
          }

          return {
            ...task,
            dependencies: [...deps, { to: targetTaskId, fromSide, toSide }]
          };
        });

        return { ...row, tasks: updatedTasks };
      });
    });
    this.api.dependencies.raiseAdd({ fromId: sourceTaskId, toId: targetTaskId });
    this.api.dependencies.raiseChange({ fromId: sourceTaskId, toId: targetTaskId });
  }

  removeDependency(sourceTaskId: string | number, targetTaskId: string | number) {
    this.rows.update(currentRows => {
      return currentRows.map(row => {
        const hasSource = (row.tasks || []).some(t => String(t.id) === String(sourceTaskId));
        if (!hasSource) return row;

        const updatedTasks = row.tasks.map(task => {
          if (String(task.id) !== String(sourceTaskId)) return task;
          const deps = task.dependencies || [];
          const updatedDeps = deps.filter(d => String(typeof d === 'object' ? d.to : d) !== String(targetTaskId));

          return {
            ...task,
            dependencies: updatedDeps
          };
        });

        return { ...row, tasks: updatedTasks };
      });
    });
    this.api.dependencies.raiseRemove({ fromId: sourceTaskId, toId: targetTaskId });
    this.api.dependencies.raiseChange({ fromId: sourceTaskId, toId: targetTaskId });
  }

  loadData(data: GanttRow[]) {
    this.rows.set(data);
    this.api.data.raiseLoad(data);
    this.api.data.raiseChange(data);
  }

  loadTimespans(ts: GanttTimespan[]) {
    this.timespans.set(ts);
  }

  isRowExpanded(row: GanttRow): boolean {
    const expandedMap = this.expandedRows();
    if (expandedMap[row.id] !== undefined) {
      return expandedMap[row.id];
    }
    if (expandedMap[row.name] !== undefined) {
      return expandedMap[row.name];
    }
    if (row.expanded !== undefined) {
      return row.expanded;
    }
    return true;
  }

  toggleRowExpand(rowId: string | number) {
    const allRows = this.rows();
    const target = allRows.find(r => r.id === rowId || String(r.id) === String(rowId) || r.name === rowId);
    const current = target ? this.isRowExpanded(target) : (this.expandedRows()[rowId] !== false);
    this.expandedRows.update(map => ({
      ...map,
      [rowId]: !current,
    }));
  }

  expandAll() {
    const map: Record<string | number, boolean> = {};
    this.rows().forEach(r => map[r.id] = true);
    this.expandedRows.set(map);
  }

  collapseAll() {
    const map: Record<string | number, boolean> = {};
    this.rows().forEach(r => map[r.id] = false);
    this.expandedRows.set(map);
  }

  clearData() {
    this.rows.set([]);
    this.timespans.set([]);
  }

  updateConfig(newConfig: Partial<GanttConfig>) {
    this.config.update(c => ({ ...c, ...newConfig }));
  }

  getPositionByDate(date: Date): number {
    const cols = this.columns();
    if (!cols.length) return 0;

    const firstCol = cols[0];
    const lastCol = cols[cols.length - 1];

    if (date < firstCol.date) {
      const msPerPx = firstCol.duration / firstCol.width;
      const diffMs = date.getTime() - firstCol.date.getTime();
      return diffMs / msPerPx;
    }

    if (date >= lastCol.endDate) {
      const msPerPx = lastCol.duration / lastCol.width;
      const diffMs = date.getTime() - lastCol.endDate.getTime();
      return lastCol.left + lastCol.width + (diffMs / msPerPx);
    }

    for (const col of cols) {
      if (date >= col.date && date < col.endDate) {
        const pct = differenceInMilliseconds(date, col.date) / col.duration;
        return col.left + (col.width * pct);
      }
    }
    return 0;
  }

  getDateByPosition(x: number): Date {
    const cols = this.columns();
    if (!cols.length) return new Date();

    const firstCol = cols[0];
    const lastCol = cols[cols.length - 1];

    if (x < 0) {
      const msPerPx = firstCol.duration / firstCol.width;
      return new Date(firstCol.date.getTime() + x * msPerPx);
    }

    const totalColsWidth = lastCol.left + lastCol.width;
    if (x >= totalColsWidth) {
      const msPerPx = lastCol.duration / lastCol.width;
      return new Date(lastCol.endDate.getTime() + (x - totalColsWidth) * msPerPx);
    }

    for (const col of cols) {
      if (x >= col.left && x < col.left + col.width) {
        const pct = (x - col.left) / col.width;
        return new Date(col.date.getTime() + col.duration * pct);
      }
    }
    return lastCol.endDate;
  }

  /**
   * Snaps a pixel position X to column grid lines, timespans, or adjacent tasks if magnet is enabled.
   */
  snapPosition(x: number, excludeTaskId?: string | number): number {
    const c = this.config();
    if (c.magnet === false || c.magnetMode === 'none') {
      return x;
    }

    const cols = this.columns();
    if (!cols.length) return x;

    const isTimeframesMode = c.magnetMode === 'timeframes';
    const magneticThreshold = isTimeframesMode ? 20 : 15;

    // Collect special snap targets (timespans and other task edges)
    const specialSnapTargets: number[] = [];

    // 1. Timespans edges
    if (isTimeframesMode || this.timespans().length > 0) {
      this.timespans().forEach(ts => {
        specialSnapTargets.push(this.getPositionByDate(ts.startDate));
        specialSnapTargets.push(this.getPositionByDate(ts.endDate));
      });
    }

    // 2. Other tasks' edges (start and end)
    this.rows().forEach(row => {
      (row.tasks || []).forEach(task => {
        if (task.id !== excludeTaskId && String(task.id) !== String(excludeTaskId)) {
          const s = parseTaskDate(task.startDate);
          const e = parseTaskDate(task.endDate);
          if (s) specialSnapTargets.push(this.getPositionByDate(s));
          if (e) specialSnapTargets.push(this.getPositionByDate(e));
        }
      });
    });

    // Check if x is within magnetic threshold of any special snap target
    let closestSpecial: number | null = null;
    let minSpecialDiff = Infinity;

    for (const targetX of specialSnapTargets) {
      const diff = Math.abs(x - targetX);
      if (diff <= magneticThreshold && diff < minSpecialDiff) {
        minSpecialDiff = diff;
        closestSpecial = targetX;
      }
    }

    if (closestSpecial !== null) {
      return closestSpecial;
    }

    // DAILY MAGNET MODE: Snap specifically to full day boundaries (00:00:00 midnight of days)
    if (c.magnetMode === 'daily') {
      const dateAtX = this.getDateByPosition(x);
      const dayStart = new Date(dateAtX.getFullYear(), dateAtX.getMonth(), dateAtX.getDate(), 0, 0, 0);
      const dayNext = new Date(dateAtX.getFullYear(), dateAtX.getMonth(), dateAtX.getDate() + 1, 0, 0, 0);

      const xDayStart = this.getPositionByDate(dayStart);
      const xDayNext = this.getPositionByDate(dayNext);

      const diffStart = Math.abs(x - xDayStart);
      const diffNext = Math.abs(x - xDayNext);

      return diffStart <= diffNext ? xDayStart : xDayNext;
    }

    // TIMEFRAMES MAGNET MODE: Grid column snapping (including hourly/sub-day timeframe columns)
    const colWidth = cols[0].width || 55;
    const firstLeft = cols[0].left;
    const lastRight = cols[cols.length - 1].left + cols[cols.length - 1].width;

    if (x < firstLeft) {
      const steps = Math.round((x - firstLeft) / colWidth);
      return firstLeft + (steps * colWidth);
    }

    if (x > lastRight) {
      const steps = Math.round((x - lastRight) / colWidth);
      return lastRight + (steps * colWidth);
    }

    // Otherwise snap to nearest grid column boundary inside visible range
    let closestGridX = cols[0].left;
    let minGridDiff = Math.abs(x - cols[0].left);

    for (const col of cols) {
      const leftDiff = Math.abs(x - col.left);
      if (leftDiff < minGridDiff) {
        minGridDiff = leftDiff;
        closestGridX = col.left;
      }
      const rightX = col.left + col.width;
      const rightDiff = Math.abs(x - rightX);
      if (rightDiff < minGridDiff) {
        minGridDiff = rightDiff;
        closestGridX = rightX;
      }
    }

    return closestGridX;
  }

  /**
   * Snaps a Date to nearest column grid line, timespan, or task edge if magnet is enabled.
   */
  snapDate(date: Date, excludeTaskId?: string | number): Date {
    const c = this.config();
    if (c.magnet === false || c.magnetMode === 'none') {
      return date;
    }

    const posX = this.getPositionByDate(date);
    const snappedX = this.snapPosition(posX, excludeTaskId);
    const snappedDate = this.getDateByPosition(snappedX);

    if (c.magnetMode === 'daily') {
      const dayStart = new Date(snappedDate.getFullYear(), snappedDate.getMonth(), snappedDate.getDate(), 0, 0, 0);
      const dayNext = new Date(snappedDate.getFullYear(), snappedDate.getMonth(), snappedDate.getDate() + 1, 0, 0, 0);

      const diffStartMs = Math.abs(snappedDate.getTime() - dayStart.getTime());
      const diffNextMs = Math.abs(snappedDate.getTime() - dayNext.getTime());

      if (diffStartMs < 3600000) return dayStart;
      if (diffNextMs < 3600000) return dayNext;
    }

    return snappedDate;
  }

  private getRowAllTasks(row: GanttRow): GanttTask[] {
    let tasks: GanttTask[] = [...(row.tasks || [])];
    const allRows = this.rows();
    const children = allRows.filter(r => r.parent === row.id || r.parent === row.name);
    children.forEach(c => {
      tasks = tasks.concat(this.getRowAllTasks(c));
    });
    return tasks;
  }

  private getMinDate(row: GanttRow): Date | null {
    const allTasks = this.getRowAllTasks(row);
    if (!allTasks.length) return null;
    const dates = allTasks
      .map(t => parseTaskDate(t.startDate))
      .filter((d): d is Date => d !== undefined);
    if (!dates.length) return null;
    return new Date(Math.min(...dates.map(d => d.getTime())));
  }

  private getMaxDate(row: GanttRow): Date | null {
    const allTasks = this.getRowAllTasks(row);
    if (!allTasks.length) return null;
    const dates = allTasks
      .map(t => parseTaskDate(t.endDate))
      .filter((d): d is Date => d !== undefined);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }
}
