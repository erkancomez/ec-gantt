import { GanttRow, GanttTask } from '../models/gantt.models';

export class GanttEventStream<T = any> {
  private listeners: Array<(data: T) => void> = [];

  on(handler: (data: T) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  raise(data: T): void {
    this.listeners.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error('Error in Gantt API event listener:', err);
      }
    });
  }

  clear(): void {
    this.listeners = [];
  }
}

export interface GanttApiCore {
  onReady: (handler: (api: GanttApi) => void) => () => void;
  onRendered: (handler: (api: GanttApi) => void) => () => void;
  raiseReady: (api: GanttApi) => void;
  raiseRendered: (api: GanttApi) => void;
  getDateByPosition: (position: number) => Date;
  getPositionByDate: (date: Date) => number;
}

export interface GanttApiData {
  onChange: (handler: (newData: GanttRow[]) => void) => () => void;
  onLoad: (handler: (data: GanttRow[]) => void) => () => void;
  onClear: (handler: () => void) => () => void;
  raiseChange: (newData: GanttRow[]) => void;
  raiseLoad: (data: GanttRow[]) => void;
  raiseClear: () => void;
  get: () => GanttRow[];
  load: (data: GanttRow[]) => void;
  clear: () => void;
}

export interface GanttApiTasks {
  onAdd: (handler: (task: GanttTask) => void) => () => void;
  onChange: (handler: (task: GanttTask) => void) => () => void;
  onRemove: (handler: (task: GanttTask) => void) => () => void;
  onMoveBegin: (handler: (task: GanttTask) => void) => () => void;
  onMove: (handler: (task: GanttTask, fromRow?: GanttRow) => void) => () => void;
  onMoveEnd: (handler: (task: GanttTask) => void) => () => void;
  onResizeBegin: (handler: (task: GanttTask) => void) => () => void;
  onResize: (handler: (task: GanttTask) => void) => () => void;
  onResizeEnd: (handler: (task: GanttTask) => void) => () => void;
  onClick: (handler: (task: GanttTask) => void) => () => void;
  onRowChange: (handler: (event: { task: GanttTask; oldRow?: GanttRow; newRow?: GanttRow }) => void) => () => void;
  onDrawBegin: (handler: (task: GanttTask) => void) => () => void;
  onDraw: (handler: (task: GanttTask) => void) => () => void;
  onDrawEnd: (handler: (task: GanttTask) => void) => () => void;
  raiseAdd: (task: GanttTask) => void;
  raiseChange: (task: GanttTask) => void;
  raiseRemove: (task: GanttTask) => void;
  raiseMoveBegin: (task: GanttTask) => void;
  raiseMove: (task: GanttTask, fromRow?: GanttRow) => void;
  raiseMoveEnd: (task: GanttTask) => void;
  raiseResizeBegin: (task: GanttTask) => void;
  raiseResize: (task: GanttTask) => void;
  raiseResizeEnd: (task: GanttTask) => void;
  raiseClick: (task: GanttTask) => void;
  raiseRowChange: (event: { task: GanttTask; oldRow?: GanttRow; newRow?: GanttRow }) => void;
  raiseDrawBegin: (task: GanttTask) => void;
  raiseDraw: (task: GanttTask) => void;
  raiseDrawEnd: (task: GanttTask) => void;
}

export interface GanttApiRows {
  onAdd: (handler: (row: GanttRow) => void) => () => void;
  onChange: (handler: (row: GanttRow) => void) => () => void;
  onRemove: (handler: (row: GanttRow) => void) => () => void;
  onMove: (handler: (event: { row: GanttRow; oldIndex: number; newIndex: number }) => void) => () => void;
  onClick: (handler: (row: GanttRow) => void) => () => void;
  raiseAdd: (row: GanttRow) => void;
  raiseChange: (row: GanttRow) => void;
  raiseRemove: (row: GanttRow) => void;
  raiseMove: (event: { row: GanttRow; oldIndex: number; newIndex: number }) => void;
  raiseClick: (row: GanttRow) => void;
}

export interface GanttApiSide {
  onResizeBegin: (handler: (width: number) => void) => () => void;
  onResize: (handler: (width: number) => void) => () => void;
  onResizeEnd: (handler: (width: number) => void) => () => void;
  raiseResizeBegin: (width: number) => void;
  raiseResize: (width: number) => void;
  raiseResizeEnd: (width: number) => void;
}

export interface GanttApiScroll {
  onScroll: (handler: (event: { left: number; date?: Date; direction?: 'left' | 'right' }) => void) => () => void;
  raiseScroll: (event: { left: number; date?: Date; direction?: 'left' | 'right' }) => void;
  to: (left: number) => void;
  toDate: (date: Date) => void;
}

export interface GanttApiDependencies {
  onAdd: (handler: (event: { fromId: string | number; toId: string | number }) => void) => () => void;
  onRemove: (handler: (event: { fromId: string | number; toId: string | number }) => void) => () => void;
  onChange: (handler: (event: { fromId: string | number; toId: string | number }) => void) => () => void;
  raiseAdd: (event: { fromId: string | number; toId: string | number }) => void;
  raiseRemove: (event: { fromId: string | number; toId: string | number }) => void;
  raiseChange: (event: { fromId: string | number; toId: string | number }) => void;
}

export class GanttApi {
  core!: GanttApiCore;
  data!: GanttApiData;
  tasks!: GanttApiTasks;
  rows!: GanttApiRows;
  side!: GanttApiSide;
  scroll!: GanttApiScroll;
  dependencies!: GanttApiDependencies;

  constructor(ganttService: any) {
    // Core Event Streams
    const readyStream = new GanttEventStream<GanttApi>();
    const renderedStream = new GanttEventStream<GanttApi>();

    this.core = {
      onReady: (fn) => readyStream.on(fn),
      onRendered: (fn) => renderedStream.on(fn),
      raiseReady: (api) => readyStream.raise(api),
      raiseRendered: (api) => renderedStream.raise(api),
      getDateByPosition: (pos: number) => ganttService.getDateByPosition(pos),
      getPositionByDate: (date: Date) => ganttService.getPositionByDate(date),
    };

    // Data Event Streams
    const dataChangeStream = new GanttEventStream<GanttRow[]>();
    const dataLoadStream = new GanttEventStream<GanttRow[]>();
    const dataClearStream = new GanttEventStream<void>();

    this.data = {
      onChange: (fn) => dataChangeStream.on(fn),
      onLoad: (fn) => dataLoadStream.on(fn),
      onClear: (fn) => dataClearStream.on(fn),
      raiseChange: (data) => dataChangeStream.raise(data),
      raiseLoad: (data) => dataLoadStream.raise(data),
      raiseClear: () => dataClearStream.raise(undefined),
      get: () => ganttService.rows(),
      load: (data: GanttRow[]) => ganttService.loadData(data),
      clear: () => ganttService.loadData([]),
    };

    // Tasks Event Streams
    const taskAddStream = new GanttEventStream<GanttTask>();
    const taskChangeStream = new GanttEventStream<GanttTask>();
    const taskRemoveStream = new GanttEventStream<GanttTask>();
    const taskMoveBeginStream = new GanttEventStream<GanttTask>();
    const taskMoveStream = new GanttEventStream<{ task: GanttTask; fromRow?: GanttRow }>();
    const taskMoveEndStream = new GanttEventStream<GanttTask>();
    const taskResizeBeginStream = new GanttEventStream<GanttTask>();
    const taskResizeStream = new GanttEventStream<GanttTask>();
    const taskResizeEndStream = new GanttEventStream<GanttTask>();
    const taskClickStream = new GanttEventStream<GanttTask>();
    const taskRowChangeStream = new GanttEventStream<{ task: GanttTask; oldRow?: GanttRow; newRow?: GanttRow }>();
    const taskDrawBeginStream = new GanttEventStream<GanttTask>();
    const taskDrawStream = new GanttEventStream<GanttTask>();
    const taskDrawEndStream = new GanttEventStream<GanttTask>();

    this.tasks = {
      onAdd: (fn) => taskAddStream.on(fn),
      onChange: (fn) => taskChangeStream.on(fn),
      onRemove: (fn) => taskRemoveStream.on(fn),
      onMoveBegin: (fn) => taskMoveBeginStream.on(fn),
      onMove: (fn) => taskMoveStream.on((ev) => fn(ev.task, ev.fromRow)),
      onMoveEnd: (fn) => taskMoveEndStream.on(fn),
      onResizeBegin: (fn) => taskResizeBeginStream.on(fn),
      onResize: (fn) => taskResizeStream.on(fn),
      onResizeEnd: (fn) => taskResizeEndStream.on(fn),
      onClick: (fn) => taskClickStream.on(fn),
      onRowChange: (fn) => taskRowChangeStream.on(fn),
      onDrawBegin: (fn) => taskDrawBeginStream.on(fn),
      onDraw: (fn) => taskDrawStream.on(fn),
      onDrawEnd: (fn) => taskDrawEndStream.on(fn),
      raiseAdd: (t) => taskAddStream.raise(t),
      raiseChange: (t) => taskChangeStream.raise(t),
      raiseRemove: (t) => taskRemoveStream.raise(t),
      raiseMoveBegin: (t) => taskMoveBeginStream.raise(t),
      raiseMove: (t, fromRow) => taskMoveStream.raise({ task: t, fromRow }),
      raiseMoveEnd: (t) => taskMoveEndStream.raise(t),
      raiseResizeBegin: (t) => taskResizeBeginStream.raise(t),
      raiseResize: (t) => taskResizeStream.raise(t),
      raiseResizeEnd: (t) => taskResizeEndStream.raise(t),
      raiseClick: (t) => taskClickStream.raise(t),
      raiseRowChange: (ev) => taskRowChangeStream.raise(ev),
      raiseDrawBegin: (t) => taskDrawBeginStream.raise(t),
      raiseDraw: (t) => taskDrawStream.raise(t),
      raiseDrawEnd: (t) => taskDrawEndStream.raise(t),
    };

    // Rows Event Streams
    const rowAddStream = new GanttEventStream<GanttRow>();
    const rowChangeStream = new GanttEventStream<GanttRow>();
    const rowRemoveStream = new GanttEventStream<GanttRow>();
    const rowMoveStream = new GanttEventStream<{ row: GanttRow; oldIndex: number; newIndex: number }>();
    const rowClickStream = new GanttEventStream<GanttRow>();

    this.rows = {
      onAdd: (fn) => rowAddStream.on(fn),
      onChange: (fn) => rowChangeStream.on(fn),
      onRemove: (fn) => rowRemoveStream.on(fn),
      onMove: (fn) => rowMoveStream.on(fn),
      onClick: (fn) => rowClickStream.on(fn),
      raiseAdd: (r) => rowAddStream.raise(r),
      raiseChange: (r) => rowChangeStream.raise(r),
      raiseRemove: (r) => rowRemoveStream.raise(r),
      raiseMove: (ev) => rowMoveStream.raise(ev),
      raiseClick: (r) => rowClickStream.raise(r),
    };

    // Side Event Streams
    const sideResizeBeginStream = new GanttEventStream<number>();
    const sideResizeStream = new GanttEventStream<number>();
    const sideResizeEndStream = new GanttEventStream<number>();

    this.side = {
      onResizeBegin: (fn) => sideResizeBeginStream.on(fn),
      onResize: (fn) => sideResizeStream.on(fn),
      onResizeEnd: (fn) => sideResizeEndStream.on(fn),
      raiseResizeBegin: (w) => sideResizeBeginStream.raise(w),
      raiseResize: (w) => sideResizeStream.raise(w),
      raiseResizeEnd: (w) => sideResizeEndStream.raise(w),
    };

    // Scroll Event Streams
    const scrollStream = new GanttEventStream<{ left: number; date?: Date; direction?: 'left' | 'right' }>();

    this.scroll = {
      onScroll: (fn) => scrollStream.on(fn),
      raiseScroll: (ev) => scrollStream.raise(ev),
      to: (left: number) => {
        ganttService.scrollToPosition?.(left);
      },
      toDate: (date: Date) => {
        const pos = ganttService.getPositionByDate(date);
        ganttService.scrollToPosition?.(pos);
      },
    };

    // Dependencies Event Streams
    const depAddStream = new GanttEventStream<{ fromId: string | number; toId: string | number }>();
    const depRemoveStream = new GanttEventStream<{ fromId: string | number; toId: string | number }>();
    const depChangeStream = new GanttEventStream<{ fromId: string | number; toId: string | number }>();

    this.dependencies = {
      onAdd: (fn) => depAddStream.on(fn),
      onRemove: (fn) => depRemoveStream.on(fn),
      onChange: (fn) => depChangeStream.on(fn),
      raiseAdd: (ev) => depAddStream.raise(ev),
      raiseRemove: (ev) => depRemoveStream.raise(ev),
      raiseChange: (ev) => depChangeStream.raise(ev),
    };
  }
}
