import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrentDateMode, GanttApi, GanttChartComponent, GanttConfig, GanttRow, GanttTimespan, SideMode, SortMode, ViewScale } from 'ec-gantt';
import { DemoService } from './demo.service';

@Component({
  selector: 'gantt-root',
  standalone: true,
  imports: [CommonModule, FormsModule, GanttChartComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class App implements OnInit, AfterViewInit {
  title = 'ec-gantt Demo Application';
  demoService = inject(DemoService);

  @ViewChild('conceptTaskTemplate') conceptTaskTemplate!: TemplateRef<any>;

  private _ganttApi?: GanttApi;

  set ganttApi(api: GanttApi | undefined) {
    this._ganttApi = api;
    if (api) {
      this.initApiListeners(api);
    }
  }

  get ganttApi(): GanttApi | undefined {
    return this._ganttApi;
  }

  initApiListeners(api: GanttApi) {
    console.log('⚡ [Gantt API] Registered successfully via [(api)] binding:', api);

    // --- CORE EVENTS ---
    api.core.onReady((api) => {
      console.log('⚡ [Gantt API Event] core.onReady -> Gantt initialized and ready!', api);
    });

    api.core.onRendered((api) => {
      console.log('⚡ [Gantt API Event] core.onRendered -> Gantt fully rendered in DOM!');
    });

    // --- DATA EVENTS ---
    api.data.onChange((data) => {
      console.log('⚡ [Gantt API Event] data.onChange -> Data updated:', data);
    });

    api.data.onLoad((data) => {
      console.log('⚡ [Gantt API Event] data.onLoad -> Data loaded:', data);
    });

    api.data.onClear(() => {
      console.log('⚡ [Gantt API Event] data.onClear -> Data cleared');
    });

    // --- TASK EVENTS ---
    api.tasks.onAdd((task) => {
      console.log('⚡ [Gantt API Event] tasks.onAdd -> New task added:', task.name, task);
    });

    api.tasks.onChange((task) => {
      console.log('⚡ [Gantt API Event] tasks.onChange -> Task dates updated:', task.name, task.startDate, task.endDate, task);
    });

    api.tasks.onMoveBegin((task) => {
      console.log('⚡ [Gantt API Event] tasks.onMoveBegin -> Task move started:', task.name);
    });

    api.tasks.onMove((task, fromRow) => {
      console.log('⚡ [Gantt API Event] tasks.onMove -> Task moving:', task.name, 'From Row:', fromRow?.name);
    });

    api.tasks.onMoveEnd((task) => {
      console.log('⚡ [Gantt API Event] tasks.onMoveEnd -> Task move completed:', task.name, task.startDate, task.endDate);
    });

    api.tasks.onResizeBegin((task) => {
      console.log('⚡ [Gantt API Event] tasks.onResizeBegin -> Task resize started:', task.name);
    });

    api.tasks.onResize((task) => {
      console.log('⚡ [Gantt API Event] tasks.onResize -> Task resizing:', task.name, task.startDate, task.endDate);
    });

    api.tasks.onResizeEnd((task) => {
      console.log('⚡ [Gantt API Event] tasks.onResizeEnd -> Task resize completed:', task.name, task.startDate, task.endDate);
    });

    api.tasks.onRemove((task) => {
      console.log('⚡ [Gantt API Event] tasks.onRemove -> Task removed:', task.name, task);
    });

    api.tasks.onClick((task) => {
      console.log('⚡ [Gantt API Event] tasks.onClick -> Task clicked:', task.name, task);
    });

    api.tasks.onRowChange(({ task, oldRow, newRow }) => {
      console.log('⚡ [Gantt API Event] tasks.onRowChange -> Task moved to new row:', task.name, 'From:', oldRow?.name, 'To:', newRow?.name);
    });

    api.tasks.onDrawBegin((task) => {
      console.log('⚡ [Gantt API Event] tasks.onDrawBegin -> Task draw started:', task.name, task.startDate);
    });

    api.tasks.onDraw((task) => {
      console.log('⚡ [Gantt API Event] tasks.onDraw -> Task draw in progress:', task.name, task.startDate, task.endDate);
    });

    api.tasks.onDrawEnd((task) => {
      console.log('⚡ [Gantt API Event] tasks.onDrawEnd -> Task draw completed & added:', task.name, task);
    });

    // --- ROW EVENTS ---
    api.rows.onAdd((row) => {
      console.log('⚡ [Gantt API Event] rows.onAdd -> Row added:', row.name, row);
    });

    api.rows.onChange((row) => {
      console.log('⚡ [Gantt API Event] rows.onChange -> Row updated:', row.name, row);
    });

    api.rows.onRemove((row) => {
      console.log('⚡ [Gantt API Event] rows.onRemove -> Row removed:', row.name, row);
    });

    api.rows.onClick((row) => {
      console.log('⚡ [Gantt API Event] rows.onClick -> Row clicked:', row.name, row);
    });

    api.rows.onMove(({ row, oldIndex, newIndex }) => {
      console.log('⚡ [Gantt API Event] rows.onMove -> Row reordered:', row.name, `${oldIndex} -> ${newIndex}`);
    });

    // --- SIDE EVENTS ---
    api.side.onResize((width) => {
      console.log('⚡ [Gantt API Event] side.onResize -> Side width resized:', width);
    });

    // --- SCROLL EVENTS ---
    api.scroll.onScroll(({ left }) => {
      console.log('⚡ [Gantt API Event] scroll.onScroll -> Chart scrolled:', left);
    });

    // --- DEPENDENCIES EVENTS ---
    api.dependencies.onAdd((dep) => {
      console.log('⚡ [Gantt API Event] dependencies.onAdd -> Connection created:', dep.fromId, '->', dep.toId);
    });

    api.dependencies.onRemove((dep) => {
      console.log('⚡ [Gantt API Event] dependencies.onRemove -> Connection removed:', dep.fromId, '->', dep.toId);
    });
  }



  scales: ViewScale[] = ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'];
  sortModes: SortMode[] = ['disabled', 'name', 'from', 'to'];
  sideModes: SideMode[] = ['TreeTable', 'Tree', 'Table', 'Disabled'];
  currentDateModes: CurrentDateMode[] = ['none', 'line', 'column'];
  outOfRangeModes = ['truncate', 'expand'];
  stepUnits = ['15 min', '1 hour', '1 day', '1 week'];
  groupDisplayModes = ['group', 'overview', 'promoted', 'disabled'];
  workingModes = ['visible', 'hidden', 'background'];
  nonWorkingModes = ['visible', 'hidden', 'cropped'];
  overlapModes = ['cascade', 'underneath'];

  optionsCollapsed = false;
  ganttCollapsed = false;
  liveCollapsed = false;
  customDimensionsEnabled = false;

  targetRowIndex = 0;
  linkSourceTaskId = 'sp1';
  linkTargetTaskId = 'sp3';

  selectedRowId: string | number = 'sprint-1';
  selectedTaskId: string | number = 'sp1';

  private now = new Date();
  private year = this.now.getFullYear();
  private month = this.now.getMonth();

  dateFromStr = `${this.year}-${String(this.month + 1).padStart(2, '0')}-01`;
  dateToStr = `${this.year}-${String(this.month + 3).padStart(2, '0')}-01`;

  ganttConfig: Partial<GanttConfig> = {
    startDate: new Date(this.year, this.month, 1, 0, 0, 0),
    endDate: new Date(this.year, this.month + 2, 1, 0, 0, 0),
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
    drawTask: true,
    drawTaskFactory: (event, row) => ({
      name: 'Çizilen Görev (' + row.name + ')',
      color: '#6366f1'
    }),
    movable: {
      allowMoving: (task) => task.name !== 'Create concept',
      allowResizing: true,
      allowRowSwitching: true
    },
    readOnly: false,
    stepUnit: '1 day',
    magnet: true,
    magnetMode: 'daily',
    groupDisplayMode: 'group',
    zoom: 1,
    workingMode: 'visible',
    nonWorkingMode: 'visible',
    dependenciesEnabled: true,
    dependenciesConflicts: true,
    rowContentEnabled: true,
    taskContentEnabled: true,
  };

  ganttRows: GanttRow[] = [];
  ganttTimespans: GanttTimespan[] = [];

  ngOnInit() {
    this.reload();
  }

  ngAfterViewInit() {
    this.assignCustomTaskTemplate();
  }

  assignCustomTaskTemplate() {
    if (this.conceptTaskTemplate) {
      this.ganttRows = this.ganttRows.map(row => {
        const updatedTasks = (row.tasks || []).map(t => {
          if (t.id === 'cc1') {
            return { ...t, content: this.conceptTaskTemplate };
          }
          return t;
        });
        return { ...row, tasks: updatedTasks };
      });
    }
  }

  onTaskIconClick(task: any) {
    alert(`⚙️ Çark ikonuna tıklandı!\nGörev Adı: ${task.name}\nGörev ID: ${task.id}`);
  }

  toggleMagnetMode(mode: 'daily' | 'timeframes') {
    if (this.ganttConfig.magnetMode === mode && this.ganttConfig.magnet) {
      this.ganttConfig.magnetMode = 'none';
      this.ganttConfig.magnet = false;
    } else {
      this.ganttConfig.magnetMode = mode;
      this.ganttConfig.magnet = true;
    }
    this.onConfigChange();
  }

  onConfigChange() {
    if (this.dateFromStr) {
      const parts = this.dateFromStr.split('-');
      if (parts.length === 3) {
        this.ganttConfig.startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    if (this.dateToStr) {
      const parts = this.dateToStr.split('-');
      if (parts.length === 3) {
        this.ganttConfig.endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    this.ganttConfig = { ...this.ganttConfig };
  }


  fitHeight() {
    this.ganttConfig.rowHeight = 38;
    this.onConfigChange();
  }

  fitWidth() {
    this.ganttConfig.zoom = 1;
    this.ganttConfig.columnWidth = 55;
    this.onConfigChange();
  }

  heightToggleEnabled = false;
  widthToggleEnabled = false;

  toggleHeightFrame() {
    this.heightToggleEnabled = !this.heightToggleEnabled;
    this.ganttConfig.height = this.heightToggleEnabled ? 500 : undefined;
    this.onConfigChange();
  }

  toggleWidthFrame() {
    this.widthToggleEnabled = !this.widthToggleEnabled;
    this.ganttConfig.width = this.widthToggleEnabled ? 600 : undefined;
    this.onConfigChange();
  }

  toggleCustomDimensions() {
    this.customDimensionsEnabled = !this.customDimensionsEnabled;
    if (this.customDimensionsEnabled) {
      // Demo Toggle ON: Apply sample custom height and width to rows and tasks
      this.ganttConfig.rowHeight = 48;
      this.ganttConfig.taskHeight = 30;

      this.ganttRows = this.ganttRows.map((row, idx) => {
        const customRowHeight = idx === 0 ? 54 : (idx === 6 ? 60 : undefined);
        const updatedTasks = (row.tasks || []).map(t => {
          if (t.id === 'sp1' || t.id === 'cc1') {
            return { ...t, height: 32, width: 220 };
          }
          if (t.id === 'ko1' || t.id === 'sm1') {
            return { ...t, height: 28 };
          }
          return t;
        });
        return { ...row, height: customRowHeight, tasks: updatedTasks };
      });
    } else {
      // Demo Toggle OFF: Restore standard defaults
      this.ganttConfig.rowHeight = 38;
      this.ganttConfig.taskHeight = 24;

      this.ganttRows = this.ganttRows.map(row => {
        const { height, ...restRow } = row as any;
        const updatedTasks = (row.tasks || []).map(t => {
          const { height, width, ...restTask } = t as any;
          return restTask;
        });
        return { ...restRow, tasks: updatedTasks };
      });
    }
    this.onConfigChange();
  }

  reload() {
    this.ganttRows = this.demoService.getSampleData();
    this.ganttTimespans = this.demoService.getSampleTimespans();
    this.assignCustomTaskTemplate();
    if (this.customDimensionsEnabled) {
      this.customDimensionsEnabled = false;
      this.toggleCustomDimensions();
    }
  }

  clear() {
    this.ganttRows = [];
    this.ganttTimespans = [];
  }

  remove() {
    if (this.ganttRows.length > 0) {
      this.ganttRows = this.ganttRows.slice(1);
    }
  }

  addOverlapTask() {
    if (this.targetRowIndex >= 0 && this.targetRowIndex < this.ganttRows.length) {
      const row = this.ganttRows[this.targetRowIndex];
      const newTask = {
        id: 'overlap-' + Date.now(),
        name: 'Overlapping Task',
        color: '#E056FD',
        startDate: new Date(2013, 9, 22, 9, 0, 0),
        endDate: new Date(2013, 9, 26, 17, 0, 0),
        progress: 50
      };
      row.tasks = [...(row.tasks || []), newTask];
      this.ganttRows = [...this.ganttRows];
      if (this.ganttApi) {
        this.ganttApi.tasks.raiseAdd(newTask);
      }
    }
  }

  connectTasks() {
    if (this.linkSourceTaskId && this.linkTargetTaskId && this.linkSourceTaskId !== this.linkTargetTaskId) {
      this.ganttRows = this.ganttRows.map(row => {
        const hasSource = (row.tasks || []).some(t => t.id === this.linkSourceTaskId);
        if (!hasSource) return row;

        const updatedTasks = row.tasks.map(task => {
          if (task.id !== this.linkSourceTaskId) return task;
          const deps = task.dependencies || [];
          const exists = deps.some(d => (typeof d === 'object' ? d.to : d) === this.linkTargetTaskId);
          if (exists) return task;
          return {
            ...task,
            dependencies: [...deps, { to: this.linkTargetTaskId }]
          };
        });

        return { ...row, tasks: updatedTasks };
      });
    }
  }



  onTaskClick(task: any) {
    if (!task) return;
    this.selectedTaskId = task.id;
    for (const r of this.ganttRows) {
      if ((r.tasks || []).some(t => String(t.id) === String(task.id))) {
        this.selectedRowId = r.id;
        break;
      }
    }
  }

  onRowClick(row: any) {
    if (!row) return;
    this.selectedRowId = row.id;
  }

  get allTasks(): { id: string | number; name: string }[] {
    const list: { id: string | number; name: string }[] = [];
    this.ganttRows.forEach(r => {
      (r.tasks || []).forEach(t => list.push({ id: t.id, name: `${r.name} ➔ ${t.name}` }));
    });
    return list;
  }

  private safeJsonStringify(obj: any): string {
    if (!obj) return '';
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
          if ('_declarationLView' in value || 'elementRef' in value || value.constructor?.name?.includes('TemplateRef')) {
            return '[TemplateRef]';
          }
        }
        return value;
      }, 2);
    } catch {
      return '[Complex Object]';
    }
  }

  get selectedRowJson(): string {
    const row = this.ganttRows.find(r => String(r.id) === String(this.selectedRowId));
    return this.safeJsonStringify(row);
  }

  get selectedTaskJson(): string {
    for (const r of this.ganttRows) {
      const t = (r.tasks || []).find(x => String(x.id) === String(this.selectedTaskId));
      if (t) return this.safeJsonStringify(t);
    }
    return '';
  }
}
