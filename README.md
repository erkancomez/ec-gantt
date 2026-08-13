# ec-gantt 🚀

> **High-Performance, Feature-Rich Standalone Angular Gantt Chart Component**

[![npm version](https://img.shields.io/npm/v/ec-gantt.svg?color=blue)](https://www.npmjs.com/package/ec-gantt)
[![license](https://img.shields.io/npm/l/ec-gantt.svg)](LICENSE)
[![angular](https://img.shields.io/badge/angular-18%2B%20%7C%2019%2B%20%7C%2020%2B%20%7C%2021%2B-red.svg)](https://angular.dev)

`ec-gantt` is a modern, lightweight, highly customizable Angular Gantt Chart component built with **Angular Signals** and standalone architecture. It provides an intuitive, high-performance timeline interface for complex project management applications with zero heavy external dependencies.

Developed by **[Erkan Çömez](https://github.com/erkancomez)**.

---

## ✨ Features

- **🚀 Standalone Component**: Seamless integration with Angular 18+ and modern standalone application configurations.
- **⚡ Angular Signals Core**: 60fps reactive rendering engine with zero unnecessary change detection ticks.
- **📅 7 View Scales**: `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year` with dynamic date calculation.
- **✏️ DrawTask Plugin**: Interactive click-and-drag task creation on empty row spaces with customizable initial task factories (`drawTaskFactory`).
- **✋ Movable Plugin**: Fine-grained task movement & resizing controls (`allowMoving`, `allowResizing`, `allowRowSwitching`) supporting boolean flags or task/row predicate functions.
- **🔀 Interactive Task Linking**: Drag-and-drop right-green endpoint to left-blue endpoint connection lines with clean inter-row gap line routing.
- **📡 Event Stream API**: Direct Approach A event listener API (`api.tasks.onMove`, `api.tasks.onResize`, `api.tasks.onDraw`, `api.side.onResize`, etc.).
- **📊 Group Display Modes**: `group` (classic bracket bar `[==================]`), `overview` (rolled-up child task bars), `promoted`, and `disabled`.
- **🔀 Flexible Overlap Modes**: `cascade` (stacks overlapping tasks onto sub-rows) and `underneath` (keeps tasks on the same lane).
- **⏰ Current Date Indicators**: Dynamic `column` (shaded band with dashed center line) or `line` indicators.
- **🌲 Side Panel Hierarchy**: Multi-column TreeTable, Tree, and Table views with resizable panels and row reordering.
- **🔍 Magnet Grid Snapping**: Daily and Timeframe snapping modes for precision drag-and-drop task resizing and moving.
- **🎨 Custom Templates**: Full Angular `TemplateRef` support for custom task bars, tooltips, and side panel row contents.
- **🎨 Pure Vanilla CSS**: Modern, clean CSS styles with CSS variables and class overrides.

---

## 📦 Installation

```bash
npm install ec-gantt
```

---

## 🛠️ Quick Start

Import `GanttChartComponent` directly in your Standalone Component:

```typescript
import { Component } from '@angular/core';
import { GanttChartComponent, GanttConfig, GanttRow, GanttApi } from 'ec-gantt';

@Component({
  selector: 'app-project-planner',
  standalone: true,
  imports: [GanttChartComponent],
  template: `
    <gantt-chart
      [(api)]="ganttApi"
      [config]="ganttConfig"
      [rows]="ganttRows"
      (taskClick)="onTaskSelected($event)"
      (rowClick)="onRowSelected($event)">
    </gantt-chart>
  `,
})
export class ProjectPlannerComponent {
  ganttApi!: GanttApi;

  ganttConfig: Partial<GanttConfig> = {
    viewScale: 'day',
    columnWidth: 55,
    rowHeight: 38,
    sideMode: 'TreeTable',
    currentDate: 'column',
    groupDisplayMode: 'group',
    taskOverlapMode: 'cascade',
    drawTask: true,
    drawTaskFactory: (event, row) => ({
      name: 'New Task (' + row.name + ')',
      color: '#6366f1'
    }),
    movable: {
      allowMoving: (task) => task.name !== 'Locked Task', // Predicate function
      allowResizing: true,
      allowRowSwitching: true
    }
  };

  ganttRows: GanttRow[] = [
    {
      id: 'group-1',
      name: 'Sprint 1',
      isGroup: true,
      expanded: true,
      tasks: [],
    },
    {
      id: 'task-1',
      name: 'Concept & Planning',
      parent: 'group-1',
      tasks: [
        {
          id: 't1',
          name: 'Concept Analysis',
          startDate: new Date(2026, 7, 10, 9, 0),
          endDate: new Date(2026, 7, 15, 17, 0),
          progressPercent: 75,
          color: '#2563eb',
        },
      ],
    },
  ];

  onTaskSelected(task: any) {
    console.log('Task clicked:', task);
  }

  onRowSelected(row: any) {
    console.log('Row clicked:', row);
  }
}
```

---

## 📡 API & Event Streams (`GanttApi`)

Bind to the API instance via two-way binding `[(api)]="ganttApi"`:

```typescript
onApiReady(api: GanttApi) {
  // Task Event Listeners
  api.tasks.onMoveBegin((task) => console.log('Move started:', task));
  api.tasks.onMove((task, fromRow) => console.log('Moving:', task, 'From:', fromRow));
  api.tasks.onMoveEnd((task) => console.log('Move completed:', task));

  api.tasks.onResizeBegin((task) => console.log('Resize started:', task));
  api.tasks.onResize((task) => console.log('Resizing:', task));
  api.tasks.onResizeEnd((task) => console.log('Resize completed:', task));

  api.tasks.onDrawBegin((task) => console.log('Draw started:', task));
  api.tasks.onDraw((task) => console.log('Drawing:', task));
  api.tasks.onDrawEnd((task) => console.log('Draw completed & added:', task));

  // Side Panel Event Listeners
  api.side.onResize((width) => console.log('Side panel width:', width));
}
```

---

## ⚙️ Configuration (`GanttConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `viewScale` | `'minute' \| 'hour' \| 'day' \| 'week' \| 'month' \| 'quarter' \| 'year'` | `'day'` | Active timeline view scale. |
| `columnWidth` | `number` | `55` | Base column width in pixels. |
| `rowHeight` | `number` | `38` | Base row height in pixels. |
| `sideWidth` | `number` | `260` | Width of the left side panel. |
| `sideMode` | `'TreeTable' \| 'Tree' \| 'Table' \| 'Disabled'` | `'TreeTable'` | Display mode for the left side panel. |
| `drawTask` | `boolean \| ((event: MouseEvent) => boolean)` | `true` | Enables click-drag task creation on empty row spaces. |
| `drawTaskFactory` | `(event: MouseEvent, row: GanttRow) => Partial<GanttTask>` | `undefined` | Custom factory function generating initial task model properties when drawing. |
| `movable` | `boolean \| ((event: MouseEvent) => boolean) \| GanttMovableOptions` | `true` | Task movement and resizing rules configuration. |
| `groupDisplayMode` | `'group' \| 'overview' \| 'promoted' \| 'disabled'` | `'group'` | Rendering mode for group/parent rows. |
| `taskOverlapMode` | `'cascade' \| 'underneath'` | `'cascade'` | Layout strategy for overlapping task bars within a row. |
| `magnet` | `boolean` | `true` | Snap task dates and positions to grid boundaries. |
| `readOnly` | `boolean` | `false` | Read-only mode disabling task dragging, resizing, and creation. |

---

## ⚙️ Building & Publishing

### Build Core Package:

```bash
npx ng build ec-gantt
```

### Publish to NPM Registry:

```bash
cd dist/ec-gantt
npm publish --access public
```

---

## 👨‍💻 Author

**Erkan Çömez**
- **GitHub**: [@erkancomez](https://github.com/erkancomez)
- **Repository**: [erkancomez/ec-gantt on GitHub](https://github.com/erkancomez/ec-gantt)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
