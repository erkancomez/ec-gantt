import { Component, inject, signal, HostListener, ElementRef, Output, Input, EventEmitter, TemplateRef } from '@angular/core';
import { GanttService } from '../services/gantt.service';
import { ComputedGanttTask, GanttDependencyLine, GanttRow, GanttTask } from '../models/gantt.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gantt-body',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="position: relative;" [style.width.px]="ganttService.totalWidth()" [style.height.px]="totalBodyHeight">
      <!-- Timespans Background Bands -->
      @for (ts of ganttService.computedTimespans(); track ts.id) {
        <div class="timespan-band"
             [style.left.px]="ts.left"
             [style.width.px]="ts.width">
          <span class="timespan-tag">{{ ts.name }}</span>
        </div>
      }

      <!-- Grid lines -->
      @for (col of ganttService.columns(); track col.date) {
        <div class="grid-col"
             [class.weekend]="col.isWeekend"
             [style.left.px]="col.left"
             [style.width.px]="col.width"></div>
      }

      <!-- Current Date Column (Shaded Band with Center Dashed Line) -->
      @if (ganttService.config().currentDate === 'column' && ganttService.currentDateColumn()) {
        <div class="current-date-column-overlay"
             [style.left.px]="ganttService.currentDateColumn()!.left"
             [style.width.px]="ganttService.currentDateColumn()!.width">
          <div class="current-date-dashed-line"></div>
        </div>
      }

      <!-- Current Date Line -->
      @if (ganttService.config().currentDate === 'line' && ganttService.currentDatePosition() >= 0) {
        <div class="current-date-line"
             [style.left.px]="ganttService.currentDatePosition()">
          <div class="current-date-dot"></div>
        </div>
      }

      <!-- Dependencies SVG Overlay -->
      <svg class="gantt-svg-overlay">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 L 2.5 5 z" fill="#4f46e5"/>
          </marker>
          <marker id="arrow-conflict" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 L 2.5 5 z" fill="#f43f5e"/>
          </marker>
        </defs>

        <!-- Existing Dependency Arrow Lines -->
        @for (line of ganttService.computedDependencies(); track line.id) {
          <g style="pointer-events: auto; cursor: pointer;" (click)="onLineClick(line, $event)">
            <!-- Thick invisible click target -->
            <path [attr.d]="getOrthogonalPath(line.x1, line.y1, line.x2, line.y2, line.fromSide || 'right', line.toSide || 'left', line.fromTaskId, line.toTaskId)"
                  fill="none"
                  stroke="transparent"
                  stroke-width="14" />
            <!-- Visible Arrow Line (Solid, Sharp Orthogonal) -->
            <path [attr.d]="getOrthogonalPath(line.x1, line.y1, line.x2, line.y2, line.fromSide || 'right', line.toSide || 'left', line.fromTaskId, line.toTaskId)"
                  fill="none"
                  [attr.stroke]="line.isConflict ? '#f43f5e' : '#4f46e5'"
                  [attr.stroke-width]="line.isConflict ? '2' : '1.8'"
                  [attr.stroke-dasharray]="line.isConflict ? '4 2' : 'none'"
                  [attr.marker-end]="line.isConflict ? 'url(#arrow-conflict)' : 'url(#arrow)'" />

            <!-- Conflict Badge Icon if conflict exists -->
            @if (line.isConflict) {
              <g style="pointer-events: none;">
                <circle [attr.cx]="(line.x1 + line.x2) / 2" [attr.cy]="(line.y1 + line.y2) / 2" r="7" fill="#f43f5e" stroke="#ffffff" stroke-width="1.5" />
                <text [attr.x]="(line.x1 + line.x2) / 2" [attr.y]="(line.y1 + line.y2) / 2 + 3" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold">!</text>
              </g>
            }
          </g>
        }

        <!-- Interactive Rubber-Band Live Linking Line -->
        @if (ganttService.linkingSource() && ganttService.linkingCurrentPos()) {
          <path [attr.d]="getOrthogonalPath(
                    ganttService.linkingSource()!.x,
                    ganttService.linkingSource()!.y,
                    ganttService.linkingCurrentPos()!.x,
                    ganttService.linkingCurrentPos()!.y,
                    ganttService.linkingSource()!.side,
                    'left'
                )"
                fill="none"
                stroke="#6366f1"
                stroke-width="2"
                stroke-dasharray="4 2" />
        }
      </svg>

      <!-- Rows -->
      @for (row of ganttService.computedRows(); track row.id; let rowIndex = $index) {
        <div class="gantt-body-row"
             [style.top.px]="getRowTop(rowIndex)"
             [style.height.px]="getRowHeight(row)"
             (pointerdown)="onRowPointerDown(row, $event)">
          
          <!-- Tasks -->
          @for (task of row.computedTasks; track task.id) {
            <!-- Task Bounds Brackets if present -->
            @if (task.boundsLeft !== undefined && task.boundsWidth !== undefined) {
              <div class="gantt-task-bounds"
                   [style.left.px]="task.boundsLeft"
                   [style.width.px]="task.boundsWidth"
                   [style.top.px]="getTaskTopOffset(row, task) - 2"
                   title="Tahmini Sınır Aralığı">
              </div>
            }

            @if (task.isOverview) {
              <!-- Overview Mode: Premium Capsule Pill Mini Bar -->
              <div class="gantt-task-overview"
                   [style.left.px]="task.left"
                   [style.width.px]="task.width"
                   [style.background]="task.color || 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'"
                   [style.opacity]="row.expanded ? (hoveredTask()?.task?.id === task.id ? 0.95 : 0.5) : 1"
                   [style.box-shadow]="row.expanded ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'"
                   (mouseenter)="onTaskMouseEnter(task, $event)"
                   (mouseleave)="onTaskMouseLeave()"
                   [title]="task.name">
              </div>
            } @else if (task.isGroup) {
              <!-- Group Summary Bar with Bracket Caps -->
              <div class="gantt-task-group"
                   [style.left.px]="task.left"
                   [style.width.px]="task.width"
                   (pointerdown)="startDrag(task, 'move', $event)"
                   (mouseenter)="onTaskMouseEnter(task, $event)"
                   (mouseleave)="onTaskMouseLeave()"
                   [attr.data-task-id]="task.id">
                <!-- Slim Horizontal Slate Bar -->
                <div class="gantt-task-group-bar">
                  <div class="gantt-task-group-cap-left"></div>
                  <div class="gantt-task-group-cap-right"></div>
                </div>
              </div>
            } @else if (task.isMilestone) {
              <!-- Milestone Task Container -->
              <div class="gantt-milestone-container"
                   [style.left.px]="task.left"
                   [style.top.px]="getTaskTopOffset(row, task) + 4"
                   (mouseenter)="onTaskMouseEnter(task, $event)"
                   (mouseleave)="onTaskMouseLeave()"
                   [attr.data-task-id]="task.id">
                   
                <!-- Milestone Diamond -->
                <div class="gantt-milestone-diamond"
                     [style.cursor]="ganttService.config().readOnly ? 'default' : 'grab'"
                     [style.background-color]="task.color || '#45607D'"
                     [style.border]="task.isOverlapping ? '1px solid #ef4444' : '1px solid rgba(0, 0, 0, 0.2)'"
                     [style.box-shadow]="task.isOverlapping ? '0 0 3px rgba(239, 68, 68, 0.4)' : 'none'"
                     (pointerdown)="startDrag(task, 'move', $event)">
                </div>

                <!-- Left Indigo Input Endpoint Handle -->
                @if (isTaskEndpointsVisible(task)) {
                  <div class="gantt-endpoint-handle gantt-endpoint-handle-left"
                       title="Sürükleyip önceki göreve bağlayın (Tersten Bağlantı)"
                       (mouseenter)="onTaskMouseEnter(task, $event)"
                       (mouseleave)="onTaskMouseLeave()"
                       (pointerdown)="startTaskLinking(task, rowIndex, $event, 'left')">
                    <div class="gantt-endpoint-dot-input"></div>
                  </div>
                }

                <!-- Right Emerald Output Endpoint Handle -->
                @if (isTaskEndpointsVisible(task)) {
                  <div class="gantt-endpoint-handle gantt-endpoint-handle-right"
                       title="Sürükleyip sonraki göreve bağlayın (Sağ)"
                       (mouseenter)="onTaskMouseEnter(task, $event)"
                       (mouseleave)="onTaskMouseLeave()"
                       (pointerdown)="startTaskLinking(task, rowIndex, $event, 'right')">
                    <div class="gantt-endpoint-dot-output"></div>
                  </div>
                }
              </div>
            } @else {
              <!-- Normal Task Bar -->
              <div class="gantt-task-bar-base"
                   [style.cursor]="isTaskMovingAllowed(task) ? 'grab' : 'default'"
                   [style.left.px]="task.left"
                   [style.width.px]="task.width"
                   [style.top.px]="getTaskTopOffset(row, task)"
                   [style.height.px]="task.height || 24"
                   [style.background-color]="task.color || '#93C47D'"
                   [style.border]="task.isOverlapping ? '1px solid #ef4444' : 'none'"
                   [style.box-shadow]="task.isOverlapping ? '0 0 3px rgba(239, 68, 68, 0.4)' : 'none'"
                   (click)="onTaskClick(task, row)"
                   (pointerdown)="startDrag(task, 'move', $event)"
                   (mouseenter)="onTaskMouseEnter(task, $event)"
                   (mouseleave)="onTaskMouseLeave()"
                   [attr.data-task-id]="task.id">

                <!-- Task Sections (Color Segmented Inner Bars) -->
                @if (task.computedSections && task.computedSections.length > 0) {
                  <div class="gantt-task-sections-container">
                    @for (sec of task.computedSections; track sec.name || $index) {
                      <div class="gantt-task-section-item"
                           [class]="sec.classes"
                           [style.left.px]="sec.left"
                           [style.width.px]="sec.width"
                           [style.background-color]="sec.color"
                           [title]="sec.name || ''">
                      </div>
                    }
                  </div>
                }
                
                <!-- Left Indigo Input Endpoint Handle -->
                @if (isTaskEndpointsVisible(task)) {
                  <div class="gantt-endpoint-handle gantt-endpoint-handle-left"
                       title="Sürükleyip önceki göreve bağlayın (Tersten Bağlantı)"
                       (mouseenter)="onTaskMouseEnter(task, $event)"
                       (mouseleave)="onTaskMouseLeave()"
                       (pointerdown)="startTaskLinking(task, rowIndex, $event, 'left')">
                    <div class="gantt-endpoint-dot-input"></div>
                  </div>
                }

                <!-- Left Resize Handle -->
                @if (isTaskResizingAllowed(task)) {
                  <div class="gantt-resize-handle-left"
                       title="Genişlet / Kısalt (Sol)"
                       (pointerdown)="startDrag(task, 'resize-left', $event)">
                  </div>
                }

                <!-- Progress Bottom Line -->
                @if (task.progressPercent > 0) {
                  <div class="gantt-task-progress-bar"
                       [style.width.%]="task.progressPercent"
                       [style.background-color]="task.progressColor && task.progressColor !== 'rgba(0, 0, 0, 0.28)' ? task.progressColor : '#22c55e'"
                       [title]="'Progress: ' + task.progressPercent + '%'"></div>
                }

                <!-- Task Name or Custom Content (HTML / TemplateRef) -->
                @if (ganttService.config().taskContentEnabled && (task.contentTemplate || taskTemplate || isTemplateRef(task.content))) {
                  <div class="gantt-task-content-container"
                       (pointerdown)="onTaskContentPointerDown($event)"
                       (mousedown)="onTaskContentPointerDown($event)">
                    <ng-container *ngTemplateOutlet="task.contentTemplate || taskTemplate || $any(task.content); context: { $implicit: task, task: task }"></ng-container>
                  </div>
                } @else if (ganttService.config().taskContentEnabled && task.content) {
                  <span class="gantt-task-content-container"
                        style="cursor: pointer;"
                        (pointerdown)="onTaskContentPointerDown($event)"
                        (mousedown)="onTaskContentPointerDown($event)"
                        [innerHTML]="task.content"></span>
                } @else {
                  <span class="gantt-task-content-text">{{ task.name }}</span>
                }

                <!-- Right Resize Handle -->
                @if (isTaskResizingAllowed(task)) {
                  <div class="gantt-resize-handle-right"
                       title="Genişlet / Kısalt (Sağ)"
                       (pointerdown)="startDrag(task, 'resize-right', $event)">
                  </div>
                }

                <!-- Right Emerald Output Endpoint Handle -->
                @if (isTaskEndpointsVisible(task)) {
                  <div class="gantt-endpoint-handle gantt-endpoint-handle-right"
                       title="Sürükleyip sonraki göreve bağlayın (Sağ)"
                       (mouseenter)="onTaskMouseEnter(task, $event)"
                       (mouseleave)="onTaskMouseLeave()"
                       (pointerdown)="startTaskLinking(task, rowIndex, $event, 'right')">
                    <div class="gantt-endpoint-dot-output"></div>
                  </div>
                }
              </div>
            }
          }
        </div>
      }
        <!-- Drawing Ghost Task Indicator -->
      @if (drawingTask()) {
        <div class="drawing-ghost-task"
             style="position: absolute; border: 2px dashed #3b82f6; background-color: rgba(59, 130, 246, 0.3); border-radius: 4px; pointer-events: none; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; font-size: 0.75rem; color: #1e40af; font-weight: bold; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);"
             [style.top.px]="getRowTop(drawingTask()!.rowIndex) + (ganttService.config().rowHeight * 0.15)"
             [style.height.px]="ganttService.config().rowHeight * 0.7"
             [style.left.px]="drawingTask()!.left"
             [style.width.px]="drawingTask()!.width">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">✨ {{ drawingTask()!.name || 'Yeni Görev' }}</span>
        </div>
      }

      <!-- Sleek Floating Tooltip -->
      @if (hoveredTask() && !activeDrag && !ganttService.linkingSource()) {
        <div class="gantt-tooltip"
             style="position: absolute; z-index: 60; pointer-events: none; transform: translate(-50%, -100%);"
             [style.left.px]="tooltipX"
             [style.top.px]="tooltipY">
          <div class="gantt-tooltip-title">{{ hoveredTask()!.task.name }}</div>
          <div class="gantt-tooltip-detail">
            <div><span>Başlangıç:</span> {{ hoveredTask()!.task.startDate | date:'dd.MM.yyyy HH:mm' }}</div>
            <div><span>Bitiş:</span> {{ hoveredTask()!.task.endDate | date:'dd.MM.yyyy HH:mm' }}</div>
            @if (hoveredTask()!.task.progressPercent > 0) {
              <div><span>İlerleme:</span> {{ hoveredTask()!.task.progressPercent }}%</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class GanttBodyComponent {
  @Input() taskTemplate?: TemplateRef<any>;

  isTemplateRef(val: any): boolean {
    return val instanceof TemplateRef;
  }

  onTaskContentPointerDown(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Automatically stop propagation for interactive elements or cursor:pointer elements in task content
    const isInteractive = target.closest('button, a, input, select, textarea, i, svg, path, img, [click], [ng-click], [role="button"], .clickable, [onclick]') !== null ||
                          window.getComputedStyle(target).cursor === 'pointer';

    if (isInteractive) {
      event.stopPropagation();
    }
  }
  @Output() taskClick = new EventEmitter<ComputedGanttTask>();

  ganttService = inject(GanttService);
  elementRef = inject(ElementRef);

  hoveredTask = signal<{ task: ComputedGanttTask; event: MouseEvent } | null>(null);
  private leaveTimeout?: any;

  drawingTask = signal<{ rowIndex: number; left: number; width: number; name?: string } | null>(null);

  isTaskEndpointsVisible(task: ComputedGanttTask): boolean {
    if (this.ganttService.config().readOnly) return false;
    if (this.ganttService.config().dependenciesEnabled === false) return false;
    return this.hoveredTask()?.task?.id === task.id ||
           this.ganttService.linkingSource() != null;
  }

  onTaskMouseEnter(task: ComputedGanttTask, event: MouseEvent) {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = undefined;
    }
    this.hoveredTask.set({ task, event });
  }

  onTaskMouseLeave() {
    this.leaveTimeout = setTimeout(() => {
      this.hoveredTask.set(null);
    }, 50);
  }

  onTaskClick(task: ComputedGanttTask, row: any) {
    this.ganttService.selectTask(task.id, row.id);
    this.taskClick.emit(task);
    this.ganttService.api.tasks.raiseClick(task);
  }

  get totalBodyHeight(): number {
    const rows = this.ganttService.computedRows();
    const defaultH = this.ganttService.config().rowHeight;
    return rows.reduce((sum, r) => sum + (r.height || defaultH), 0) || 500;
  }

  onRowPointerDown(row: any, event: PointerEvent) {
    const config = this.ganttService.config();
    if (config.readOnly || !config.drawTask) return;

    const drawTaskOpt = config.drawTask;
    if (typeof drawTaskOpt === 'function') {
      if (!drawTaskOpt(event)) return;
    } else if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('[data-task-id]')) return; // Clicked on existing task

    event.preventDefault();
    event.stopPropagation();

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const rows = this.ganttService.computedRows();
    const rowIndex = rows.findIndex(r => r.id === row.id);

    const factoryFn = config.drawTaskFactory;
    const factoryCustomProps = factoryFn ? factoryFn(event, row) : {};

    let hasTriggeredDrawBegin = false;
    let drawnTaskModel: GanttTask | null = null;

    const moveHandler = (e: PointerEvent) => {
      const currentX = e.clientX - rect.left;

      if (!hasTriggeredDrawBegin) {
        hasTriggeredDrawBegin = true;

        let startDate = this.ganttService.getDateByPosition(Math.min(startX, currentX));
        let endDate = this.ganttService.getDateByPosition(Math.max(startX, currentX));

        drawnTaskModel = {
          id: 'drawn-' + Date.now(),
          name: factoryCustomProps.name || 'Yeni Görev',
          startDate,
          endDate: endDate.getTime() > startDate.getTime() ? endDate : new Date(startDate.getTime() + 86400000),
          color: factoryCustomProps.color || '#E06666',
          ...factoryCustomProps
        };

        this.ganttService.api.tasks.raiseDrawBegin(drawnTaskModel);
      }

      let left = Math.min(startX, currentX);
      let width = Math.max(Math.abs(currentX - startX), 15);

      if (config.magnet !== false && config.magnetMode !== 'none') {
        const startPos = this.ganttService.snapPosition(left);
        const endPos = this.ganttService.snapPosition(left + width);
        left = Math.min(startPos, endPos);
        width = Math.max(Math.abs(endPos - startPos), 15);
      }

      let startDate = this.ganttService.getDateByPosition(left);
      let endDate = this.ganttService.getDateByPosition(left + width);

      if (config.magnet !== false && config.magnetMode !== 'none') {
        startDate = this.ganttService.snapDate(startDate);
        endDate = this.ganttService.snapDate(endDate);
      }

      if (drawnTaskModel) {
        drawnTaskModel.startDate = startDate;
        drawnTaskModel.endDate = endDate.getTime() > startDate.getTime() ? endDate : new Date(startDate.getTime() + 86400000);
        this.ganttService.api.tasks.raiseDraw(drawnTaskModel);
      }

      this.drawingTask.set({ rowIndex, left, width, name: drawnTaskModel?.name });
    };

    const upHandler = (e: PointerEvent) => {
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);

      this.drawingTask.set(null);

      if (hasTriggeredDrawBegin && drawnTaskModel) {
        this.ganttService.addTaskToRow(row.id, drawnTaskModel);
        this.ganttService.api.tasks.raiseDrawEnd(drawnTaskModel);
      }
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }

  activeDrag: {
    task: ComputedGanttTask;
    mode: 'move' | 'resize-left' | 'resize-right';
    grabOffsetMs: number;
    duration: number;
  } | null = null;

  get tooltipX(): number {
    const item = this.hoveredTask();
    if (!item) return 0;
    return item.task.left + item.task.width / 2;
  }

  get tooltipY(): number {
    const item = this.hoveredTask();
    if (!item) return 0;
    const rowTop = this.getRowTop(item.task.rowIndex);
    const taskOffset = this.getTaskTopOffset(null, item.task);
    return rowTop + taskOffset - 6;
  }

  getRowTop(index: number): number {
    const defaultHeight = this.ganttService.config().rowHeight;
    const rows = this.ganttService.computedRows();
    let top = 0;
    for (let i = 0; i < index; i++) {
      top += rows[i].height || defaultHeight;
    }
    return top;
  }

  getRowHeight(row: any): number {
    return row.height || this.ganttService.config().rowHeight;
  }

  getTaskTopOffset(row: any, task: ComputedGanttTask): number {
    const subIdx = task.subRowIndex || 0;
    const taskH = task.height || 24;
    const baseRowH = this.ganttService.config().rowHeight || 38;
    const padding = Math.max((baseRowH - taskH) / 2, 2);
    return padding + (subIdx * (taskH + 4));
  }

  // --- AUTO SCROLL CONTROLLER ---

  private autoScrollFrameId?: number;
  private lastPointerEvent?: PointerEvent;

  private getScrollContainer(): HTMLElement | null {
    return this.elementRef.nativeElement.closest('.gantt-body-scroll') ||
           this.elementRef.nativeElement.closest('.gantt-chart-scroll') ||
           this.elementRef.nativeElement.closest('.gantt-container') ||
           this.elementRef.nativeElement.parentElement;
  }

  private startAutoScrollLoop() {
    const loop = () => {
      if ((this.activeDrag || this.ganttService.linkingSource()) && this.lastPointerEvent) {
        this.checkAutoScroll(this.lastPointerEvent);
        this.autoScrollFrameId = requestAnimationFrame(loop);
      } else {
        this.stopAutoScrollLoop();
      }
    };
    this.stopAutoScrollLoop();
    this.autoScrollFrameId = requestAnimationFrame(loop);
  }

  private stopAutoScrollLoop() {
    if (this.autoScrollFrameId) {
      cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = undefined;
    }
  }

  private checkAutoScroll(event: PointerEvent) {
    const scrollContainer = this.getScrollContainer();
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const buffer = 40;
    const maxSpeed = 8;

    if (event.clientX > rect.right - buffer) {
      const intensity = Math.min(1, Math.max(0.1, (event.clientX - (rect.right - buffer)) / buffer));
      const scrollDelta = Math.max(2, Math.round(intensity * maxSpeed));
      scrollContainer.scrollLeft += scrollDelta;

      if (this.activeDrag) {
        this.onPointerMove(event);
      } else if (this.ganttService.linkingSource()) {
        const bodyRect = this.elementRef.nativeElement.getBoundingClientRect();
        const mouseX = event.clientX - bodyRect.left;
        const mouseY = event.clientY - bodyRect.top;
        this.ganttService.updateLinkingPos(mouseX, mouseY);
      }
    } else if (event.clientX < rect.left + buffer && scrollContainer.scrollLeft > 0) {
      const intensity = Math.min(1, Math.max(0.1, ((rect.left + buffer) - event.clientX) / buffer));
      const scrollDelta = Math.max(2, Math.round(intensity * maxSpeed));
      scrollContainer.scrollLeft -= scrollDelta;

      if (this.activeDrag) {
        this.onPointerMove(event);
      } else if (this.ganttService.linkingSource()) {
        const bodyRect = this.elementRef.nativeElement.getBoundingClientRect();
        const mouseX = event.clientX - bodyRect.left;
        const mouseY = event.clientY - bodyRect.top;
        this.ganttService.updateLinkingPos(mouseX, mouseY);
      }
    }
  }

  // --- MOVABLE OPTIONS HELPERS ---

  isMovableEnabled(event?: MouseEvent): boolean {
    const config = this.ganttService.config();
    if (config.readOnly) return false;

    const mov = config.movable;
    if (mov === false) return false;
    if (typeof mov === 'boolean') return mov;

    if (typeof mov === 'function') {
      return event ? (mov as any)(event) : true;
    }

    return true;
  }

  isTaskMovingAllowed(task: ComputedGanttTask): boolean {
    if (!this.isMovableEnabled()) return false;
    const config = this.ganttService.config();

    if (config.allowMoving !== undefined) {
      if (typeof config.allowMoving === 'boolean') return config.allowMoving;
      if (typeof config.allowMoving === 'function') return config.allowMoving(task);
    }

    if (typeof config.movable === 'object' && config.movable !== null && config.movable.allowMoving !== undefined) {
      if (typeof config.movable.allowMoving === 'boolean') return config.movable.allowMoving;
      if (typeof config.movable.allowMoving === 'function') return config.movable.allowMoving(task);
    }

    return true;
  }

  isTaskResizingAllowed(task: ComputedGanttTask): boolean {
    if (!this.isMovableEnabled()) return false;
    const config = this.ganttService.config();

    if (config.allowResizing !== undefined) {
      if (typeof config.allowResizing === 'boolean') return config.allowResizing;
      if (typeof config.allowResizing === 'function') return config.allowResizing(task);
    }

    if (typeof config.movable === 'object' && config.movable !== null && config.movable.allowResizing !== undefined) {
      if (typeof config.movable.allowResizing === 'boolean') return config.movable.allowResizing;
      if (typeof config.movable.allowResizing === 'function') return config.movable.allowResizing(task);
    }

    return true;
  }

  isRowSwitchingAllowed(task: ComputedGanttTask, targetRow: GanttRow): boolean {
    if (!this.isMovableEnabled()) return false;
    const config = this.ganttService.config();

    if (config.allowRowSwitching !== undefined) {
      if (typeof config.allowRowSwitching === 'boolean') return config.allowRowSwitching;
      if (typeof config.allowRowSwitching === 'function') return config.allowRowSwitching(task, targetRow);
    }

    if (typeof config.movable === 'object' && config.movable !== null && config.movable.allowRowSwitching !== undefined) {
      if (typeof config.movable.allowRowSwitching === 'boolean') return config.movable.allowRowSwitching;
      if (typeof config.movable.allowRowSwitching === 'function') return config.movable.allowRowSwitching(task, targetRow);
    }

    return true;
  }

  // --- DRAG / RESIZE INTERACTION CONTROLLER ---

  startDrag(task: ComputedGanttTask, mode: 'move' | 'resize-left' | 'resize-right', event: PointerEvent) {
    if (!this.isMovableEnabled(event)) return;
    if (mode === 'move' && !this.isTaskMovingAllowed(task)) return;
    if (mode.startsWith('resize') && !this.isTaskResizingAllowed(task)) return;

    event.stopPropagation();
    event.preventDefault();

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const startMouseX = event.clientX - rect.left;
    const startMouseDate = this.ganttService.getDateByPosition(startMouseX);
    const grabOffsetMs = startMouseDate.getTime() - task.startDate.getTime();

    this.activeDrag = {
      task,
      mode,
      grabOffsetMs,
      duration: task.endDate.getTime() - task.startDate.getTime(),
    };

    if (mode === 'move') {
      this.ganttService.api.tasks.raiseMoveBegin(task);
    } else if (mode.startsWith('resize')) {
      this.ganttService.api.tasks.raiseResizeBegin(task);
    }

    this.lastPointerEvent = event;
    this.startAutoScrollLoop();

    const moveHandler = (e: PointerEvent) => this.onPointerMove(e);
    const upHandler = (e: PointerEvent) => {
      this.stopAutoScrollLoop();
      this.lastPointerEvent = undefined;
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);

      if (mode === 'move') {
        this.ganttService.api.tasks.raiseMoveEnd(task);
      } else if (mode.startsWith('resize')) {
        this.ganttService.api.tasks.raiseResizeEnd(task);
      }

      this.activeDrag = null;
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.activeDrag) return;
    this.lastPointerEvent = event;

    const { task, mode, grabOffsetMs, duration } = this.activeDrag;
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const currentMouseX = event.clientX - rect.left;
    const currentMouseY = event.clientY - rect.top;
    const currentMouseDate = this.ganttService.getDateByPosition(currentMouseX);

    if (mode === 'move') {
      const newStartDate = new Date(currentMouseDate.getTime() - grabOffsetMs);
      const newEndDate = new Date(newStartDate.getTime() + duration);
      this.ganttService.updateTaskDates(task.id, newStartDate, newEndDate, { mode: 'move' });

      // Row switching logic when allowed
      const rows = this.ganttService.computedRows();
      const currentSourceRow = rows.find(rowObj => rowObj.computedTasks.some(t => t.id === task.id));

      let accumulatedTop = 0;
      for (const r of rows) {
        const rHeight = r.height || this.ganttService.config().rowHeight;
        if (currentMouseY >= accumulatedTop && currentMouseY < accumulatedTop + rHeight) {
          if (currentSourceRow && currentSourceRow.id !== r.id && !r.isGroup && this.isRowSwitchingAllowed(task, r)) {
            this.ganttService.moveTaskToRow(task.id, r.id);
          }
          break;
        }
        accumulatedTop += rHeight;
      }

      this.ganttService.api.tasks.raiseMove(task, currentSourceRow);
    } else if (mode === 'resize-left') {
      let d1 = currentMouseDate;
      let d2 = task.endDate;
      if (d1.getTime() > d2.getTime()) {
        const temp = d1;
        d1 = d2;
        d2 = temp;
      }
      this.ganttService.updateTaskDates(task.id, d1, d2, { mode: 'resize-left' });
      this.ganttService.api.tasks.raiseResize(task);
    } else if (mode === 'resize-right') {
      let d1 = task.startDate;
      let d2 = currentMouseDate;
      if (d1.getTime() > d2.getTime()) {
        const temp = d1;
        d1 = d2;
        d2 = temp;
      }
      this.ganttService.updateTaskDates(task.id, d1, d2, { mode: 'resize-right' });
    }
  }

  // --- TASK LINKING CONTROLLER ---

  startTaskLinking(task: ComputedGanttTask, rowIndex: number, event: PointerEvent, side: 'left' | 'right' = 'right') {
    if (this.ganttService.config().readOnly) return;
    event.stopPropagation();
    event.preventDefault();

    const rowTop = this.getRowTop(rowIndex);
    const subIdx = task.subRowIndex || 0;
    const startX = task.isMilestone
      ? (side === 'left' ? task.left - 8 : task.left + 8)
      : (side === 'left' ? task.left : task.left + task.width);
    const startY = rowTop + 18 + (subIdx * 28);

    this.ganttService.startLinking(task, startX, startY, side);

    this.lastPointerEvent = event;
    this.startAutoScrollLoop();

    const moveHandler = (e: PointerEvent) => {
      this.lastPointerEvent = e;
      const rect = this.elementRef.nativeElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.ganttService.updateLinkingPos(mouseX, mouseY);
    };

    const upHandler = (e: PointerEvent) => {
      this.stopAutoScrollLoop();
      this.lastPointerEvent = undefined;
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);

      // Detect element under pointer (supports stacked elements)
      const elements = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [document.elementFromPoint(e.clientX, e.clientY)];
      let taskEl: Element | null = null;
      let targetId: string | null = null;

      for (const el of elements) {
        if (!el) continue;
        const foundEl = el.closest('[data-task-id]');
        if (foundEl) {
          taskEl = foundEl;
          targetId = foundEl.getAttribute('data-task-id');
          break;
        }
      }

      if (taskEl && targetId) {
        const taskRect = taskEl.getBoundingClientRect();
        const isLeftHalf = e.clientX < taskRect.left + taskRect.width / 2;
        const toSide: 'left' | 'right' = isLeftHalf ? 'left' : 'right';

        const allRows = this.ganttService.computedRows();
        for (const r of allRows) {
          const found = r.computedTasks.find((t: ComputedGanttTask) => String(t.id) === String(targetId));
          if (found) {
            this.ganttService.completeLinking(found, side, toSide);
            return;
          }
        }
      }

      this.ganttService.cancelLinking();
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }

  onLineClick(line: GanttDependencyLine, event: MouseEvent) {
    event.stopPropagation();
    const parts = line.id.split('->');
    if (parts.length === 2) {
      if (confirm(`Bağlantı silinsin mi: "${parts[0]}" -> "${parts[1]}"?`)) {
        this.ganttService.removeDependency(parts[0], parts[1]);
      }
    }
  }

  private waypointsToSmoothPath(pts: { x: number; y: number }[], r = 6): string {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      const dxIn = Math.sign(curr.x - prev.x);
      const dyIn = Math.sign(curr.y - prev.y);
      const dxOut = Math.sign(next.x - curr.x);
      const dyOut = Math.sign(next.y - curr.y);

      const distIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const distOut = Math.hypot(next.x - curr.x, next.y - curr.y);
      const actualR = Math.min(r, distIn / 2, distOut / 2);

      const startX = curr.x - dxIn * actualR;
      const startY = curr.y - dyIn * actualR;
      const endX = curr.x + dxOut * actualR;
      const endY = curr.y + dyOut * actualR;

      path += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
    }

    const last = pts[pts.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  }

  private hasTaskInFront(x1: number, y1: number, x2: number, fromTaskId?: string | number, toTaskId?: string | number): boolean {
    const minX = Math.min(x1, x2) + 6;
    const maxX = Math.max(x1, x2) - 12;
    if (maxX <= minX) return false;

    const rows = this.ganttService.computedRows();
    let currentY = 0;
    const defaultRowH = this.ganttService.config().rowHeight || 38;

    for (const row of rows) {
      const h = row.height || defaultRowH;
      for (const t of row.computedTasks) {
        const subIdx = t.subRowIndex || 0;
        const taskCenterY = currentY + 18 + (subIdx * 28);

        if (Math.abs(taskCenterY - y1) < 14) {
          if (t.id === fromTaskId || t.id === toTaskId) continue;
          const tLeft = t.left;
          const tRight = t.left + t.width;
          if (tLeft < maxX && tRight > minX) {
            return true;
          }
        }
      }
      currentY += h;
    }

    return false;
  }

  getOrthogonalPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    fromSide: 'left' | 'right' = 'right',
    toSide: 'left' | 'right' = 'left',
    fromTaskId?: string | number,
    toTaskId?: string | number
  ): string {
    const isSameRow = Math.abs(y1 - y2) < 4;

    if (isSameRow) {
      return this.waypointsToSmoothPath([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
    }

    const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];

    if (fromSide === 'right' && toSide === 'left') {
      const minCornerGap = 16;
      if (x2 >= x1 + minCornerGap) {
        const isBlocked = this.hasTaskInFront(x1, y1, x2, fromTaskId, toTaskId);
        if (!isBlocked) {
          // Direct route: extend straight on y1 until in front of target (x2 - 12), then turn down/up to y2
          const turnX = x2 - 12;
          pts.push(
            { x: turnX, y: y1 },
            { x: turnX, y: y2 },
            { x: x2, y: y2 }
          );
        } else {
          // Route via row gap (satır arası): step out 12px, drop into gap between rows, travel horizontally, turn into target
          const yGap = y1 + (y2 > y1 ? 15 : -15);
          const exitX = x1 + 12;
          const turnX = x2 - 12;
          pts.push(
            { x: exitX, y: y1 },
            { x: exitX, y: yGap },
            { x: turnX, y: yGap },
            { x: turnX, y: y2 },
            { x: x2, y: y2 }
          );
        }
      } else {
        // Target is behind or overlapping: route around via row gap yGap
        const yGap = y1 + (y2 > y1 ? 15 : -15);
        const exitX = x1 + 12;
        const enterX = x2 - 12;
        pts.push(
          { x: exitX, y: y1 },
          { x: exitX, y: yGap },
          { x: enterX, y: yGap },
          { x: enterX, y: y2 },
          { x: x2, y: y2 }
        );
      }
    } else if (fromSide === 'left' && toSide === 'right') {
      const minCornerGap = 16;
      if (x1 >= x2 + minCornerGap) {
        const isBlocked = this.hasTaskInFront(x2, y1, x1, fromTaskId, toTaskId);
        if (!isBlocked) {
          const turnX = x2 + 12;
          pts.push(
            { x: turnX, y: y1 },
            { x: turnX, y: y2 },
            { x: x2, y: y2 }
          );
        } else {
          const yGap = y1 + (y2 > y1 ? 15 : -15);
          const exitX = x1 - 12;
          const turnX = x2 + 12;
          pts.push(
            { x: exitX, y: y1 },
            { x: exitX, y: yGap },
            { x: turnX, y: yGap },
            { x: turnX, y: y2 },
            { x: x2, y: y2 }
          );
        }
      } else {
        const yGap = y1 + (y2 > y1 ? 15 : -15);
        const exitX = x1 - 12;
        const enterX = x2 + 12;
        pts.push(
          { x: exitX, y: y1 },
          { x: exitX, y: yGap },
          { x: enterX, y: yGap },
          { x: enterX, y: y2 },
          { x: x2, y: y2 }
        );
      }
    } else if (fromSide === 'left' && toSide === 'left') {
      const outerX = Math.min(x1, x2) - 16;
      pts.push(
        { x: outerX, y: y1 },
        { x: outerX, y: y2 },
        { x: x2, y: y2 }
      );
    } else {
      // right to right
      const outerX = Math.max(x1, x2) + 16;
      pts.push(
        { x: outerX, y: y1 },
        { x: outerX, y: y2 },
        { x: x2, y: y2 }
      );
    }

    return this.waypointsToSmoothPath(pts);
  }
}
