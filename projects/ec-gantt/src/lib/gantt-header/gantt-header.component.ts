import { Component, inject } from '@angular/core';
import { GanttService } from '../services/gantt.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gantt-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (row of ganttService.headers(); track $index) {
      <div class="header-row" [style.height.px]="ganttService.config().headerHeight">
        @for (header of row.headers; track header.date) {
          <div class="header-cell"
               [style.left.px]="header.left"
               [style.width.px]="header.width">
            {{ header.label }}
          </div>
        }
      </div>
    }
  `
})
export class GanttHeaderComponent {
  ganttService = inject(GanttService);
}
