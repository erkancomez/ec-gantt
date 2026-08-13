import { Component, inject, Output, EventEmitter, TemplateRef } from '@angular/core';
import { GanttService } from '../services/gantt.service';
import { GanttRow } from '../models/gantt.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gantt-side',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="height: 100%; display: flex; flex-direction: column; background: #fff; border-right: 1px solid var(--color-border); user-select: none;">
      <!-- Side Header (TreeTable Header Columns) -->
      <div class="side-table-header" [style.height.px]="ganttService.config().headerHeight * ganttService.headers().length">
        <div class="drag-handle">⋮</div>
        <div style="flex: 1; padding: 0 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span>Name</span>
        </div>
        @if (ganttService.config().sideMode === 'TreeTable' || ganttService.config().sideMode === 'Table') {
          <div style="width: 112px; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">From</div>
          <div style="width: 112px; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">To</div>
        }
      </div>

      <!-- Side Rows (Tree Hierarchy with Drag & Drop Reordering) -->
      <div class="gantt-side-body-scroll" style="flex: 1; overflow: hidden; position: relative;" (wheel)="onSideWheel($event)">
        <div style="position: relative;" [style.height.px]="ganttService.totalBodyHeight()">
          @for (row of ganttService.computedRows(); track row.id; let rowIndex = $index) {
            <div class="side-row"
                 [class.dragging]="draggedRowId === row.id"
                 [style.position]="'absolute'"
                 [style.top.px]="getRowTop(rowIndex)"
                 [style.left]="0"
                 [style.right]="0"
                 [style.height.px]="row.height || ganttService.config().rowHeight"
                 [style.background-color]="row.id === ganttService.selectedRowId() ? '#e0e7ff' : (row.color || '')"
                 (click)="onRowClick(row)"
                 draggable="true"
                 (dragstart)="onDragStart(row, $event)"
                 (dragover)="onDragOver($event)"
                 (drop)="onDrop(row, $event)">
              
              <!-- Drag Grip Handle -->
              <div class="drag-handle">
                ⋮⋮
              </div>

              <!-- Name Column: Tree (with Chevron & Indent) vs Table (Flat) -->
              @if (ganttService.config().sideMode === 'Tree' || ganttService.config().sideMode === 'TreeTable') {
                <div style="flex: 1; padding: 0 8px; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;" [style.padding-left.px]="4 + (row.level * 16)">
                  @if (row.hasChildren) {
                    <button (click)="onToggleExpand(row, $event)"
                            class="tree-expand-btn"
                            [class.expanded]="row.expanded">
                      ▶
                    </button>
                  } @else {
                    <span style="width: 16px; margin-right: 4px;"></span>
                  }
                  @if (ganttService.config().rowContentEnabled && (row.contentTemplate || isTemplateRef(row.content))) {
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <ng-container *ngTemplateOutlet="row.contentTemplate || $any(row.content); context: { $implicit: row, row: row }"></ng-container>
                    </div>
                  } @else if (ganttService.config().rowContentEnabled && row.content) {
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [innerHTML]="row.content"></span>
                  } @else {
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="row.name">{{ row.name }}</span>
                  }
                </div>
              } @else {
                <!-- Flat Table Mode: No Tree Expand Arrow, No Level Indentation -->
                <div style="flex: 1; padding: 0 8px; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;">
                  @if (ganttService.config().rowContentEnabled && (row.contentTemplate || isTemplateRef(row.content))) {
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <ng-container *ngTemplateOutlet="row.contentTemplate || $any(row.content); context: { $implicit: row, row: row }"></ng-container>
                    </div>
                  } @else if (ganttService.config().rowContentEnabled && row.content) {
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [innerHTML]="row.content"></span>
                  } @else {
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="row.name">{{ row.name }}</span>
                  }
                </div>
              }

              <!-- TreeTable Dates Columns -->
              @if (ganttService.config().sideMode === 'TreeTable' || ganttService.config().sideMode === 'Table') {
                <div style="width: 112px; padding: 0 8px; font-size: 0.75rem; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ row.minDate ? (row.minDate | date:'dd.MM.yyyy') : '-' }}
                </div>
                <div style="width: 112px; padding: 0 8px; font-size: 0.75rem; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ row.maxDate ? (row.maxDate | date:'dd.MM.yyyy') : '-' }}
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class GanttSideComponent {
  @Output() rowClick = new EventEmitter<GanttRow>();

  isTemplateRef(val: any): boolean {
    return val instanceof TemplateRef;
  }

  ganttService = inject(GanttService);
  draggedRowId: string | number | null = null;

  getRowTop(index: number): number {
    const rows = this.ganttService.computedRows();
    let top = 0;
    const defaultH = this.ganttService.config().rowHeight;
    for (let i = 0; i < index; i++) {
      top += rows[i].height || defaultH;
    }
    return top;
  }

  onSideWheel(event: WheelEvent) {
    const body = document.querySelector('.gantt-body-scroll') as HTMLElement;
    if (body) {
      body.scrollTop += event.deltaY;
    }
  }

  onToggleExpand(row: any, event: MouseEvent) {
    event.stopPropagation();
    this.ganttService.toggleRowExpand(row.id);
  }

  onRowClick(row: any) {
    this.ganttService.selectRow(row.id);
    this.rowClick.emit(row);
    this.ganttService.api.rows.raiseClick(row);
  }

  onSideScroll(event: Event) {
    const el = event.target as HTMLElement;
    const body = document.querySelector('.gantt-body-scroll') as HTMLElement;
    if (body) body.scrollTop = el.scrollTop;
  }

  onDragStart(row: any, event: DragEvent) {
    this.draggedRowId = row.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(row.id));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(targetRow: any, event: DragEvent) {
    event.preventDefault();
    if (this.draggedRowId && this.draggedRowId !== targetRow.id) {
      this.ganttService.reorderRows(this.draggedRowId, targetRow.id);
    }
    this.draggedRowId = null;
  }
}
