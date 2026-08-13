import { Component, Input, Output, EventEmitter, inject, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { GanttService } from '../services/gantt.service';
import { GanttApi } from '../services/gantt-api';
import { GanttConfig, GanttRow, GanttTimespan, GanttTask } from '../models/gantt.models';
import { GanttHeaderComponent } from '../gantt-header/gantt-header.component';
import { GanttBodyComponent } from '../gantt-body/gantt-body.component';
import { GanttSideComponent } from '../gantt-side/gantt-side.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gantt-chart',
  standalone: true,
  imports: [CommonModule, GanttHeaderComponent, GanttBodyComponent, GanttSideComponent],
  providers: [GanttService],
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css']
})
export class GanttChartComponent implements AfterViewInit, OnDestroy {
  @Input() set config(value: Partial<GanttConfig>) {
    this.ganttService.updateConfig(value);
  }
  @Input() set rows(value: GanttRow[]) {
    this.ganttService.loadData(value);
  }
  @Input() set timespans(value: GanttTimespan[]) {
    this.ganttService.loadTimespans(value || []);
  }

  @Input() set api(val: any) {
    if (typeof val === 'function') {
      val(this.ganttService.api);
    }
  }

  get ganttApi(): GanttApi {
    return this.ganttService.api;
  }

  @Input() height?: number | string;
  @Input() width?: number | string;

  get containerHeightStyle(): string | null {
    const h = this.height ?? this.ganttService.config().height;
    if (h === undefined || h === null) return null;
    return typeof h === 'number' ? `${h}px` : h;
  }

  get containerWidthStyle(): string | null {
    const w = this.width ?? this.ganttService.config().width;
    if (w === undefined || w === null) return null;
    return typeof w === 'number' ? `${w}px` : w;
  }

  @Output() taskClick = new EventEmitter<GanttTask>();
  @Output() rowClick = new EventEmitter<GanttRow>();
  @Output() apiChange = new EventEmitter<GanttApi>();
  @Output() apiRegister = new EventEmitter<GanttApi>();
  @Output() registerApi = new EventEmitter<GanttApi>();

  ganttService = inject(GanttService);
  private elementRef = inject(ElementRef);
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit() {
    // Emit Gantt API instance
    const apiInstance = this.ganttService.api;
    this.apiChange.emit(apiInstance);
    this.apiRegister.emit(apiInstance);
    this.registerApi.emit(apiInstance);

    setTimeout(() => {
      apiInstance.core.raiseReady(apiInstance);
      apiInstance.core.raiseRendered(apiInstance);
    }, 0);

    const mainWrapper = this.elementRef.nativeElement.querySelector('.gantt-main-wrapper');
    if (mainWrapper) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect) {
            this.ganttService.containerWidth.set(Math.floor(entry.contentRect.width));
          }
        }
      });
      this.resizeObserver.observe(mainWrapper);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    const header = this.elementRef.nativeElement.querySelector('.gantt-header-scroll') as HTMLElement;
    const side = this.elementRef.nativeElement.querySelector('.gantt-side-body-scroll') as HTMLElement;
    if (header) header.scrollLeft = el.scrollLeft;
    if (side) side.scrollTop = el.scrollTop;

    this.ganttService.api.scroll.raiseScroll({ left: el.scrollLeft });
  }

  startSideResize(event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const initialWidth = this.ganttService.config().sideWidth;
    this.ganttService.api.side.raiseResizeBegin(initialWidth);

    const moveHandler = (e: PointerEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(120, Math.min(600, initialWidth + deltaX));
      this.ganttService.updateConfig({ sideWidth: newWidth });
      this.ganttService.api.side.raiseResize(newWidth);
    };

    const upHandler = () => {
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      this.ganttService.api.side.raiseResizeEnd(this.ganttService.config().sideWidth);
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }
}
