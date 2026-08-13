import { Injectable } from '@angular/core';
import { GanttRow, GanttTimespan } from 'ec-gantt';

@Injectable({
  providedIn: 'root'
})
export class DemoService {

  getSampleData(): GanttRow[] {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return [
      {
        id: 'milestones',
        name: 'Milestones',
        height: 44,
        color: '#F0F4F8',
        tasks: [
          { id: 'm1', name: 'Kickoff', color: '#93C47D', startDate: new Date(y, m, 1, 9, 0, 0), endDate: new Date(y, m, 1, 10, 0, 0) },
          { id: 'm2', name: 'Concept approval', color: '#93C47D', startDate: new Date(y, m, 12, 18, 0, 0), endDate: new Date(y, m, 12, 18, 0, 0) },
          { id: 'm3', name: 'Development finished', color: '#93C47D', startDate: new Date(y, m + 1, 5, 18, 0, 0), endDate: new Date(y, m + 1, 5, 18, 0, 0) },
          { id: 'm4', name: 'Shop is running', color: '#93C47D', startDate: new Date(y, m + 1, 12, 12, 0, 0), endDate: new Date(y, m + 1, 12, 12, 0, 0) },
          { id: 'm5', name: 'Go-live', color: '#93C47D', startDate: new Date(y, m + 1, 20, 16, 0, 0), endDate: new Date(y, m + 1, 20, 16, 0, 0) }
        ]
      },
      {
        id: 'status-meetings',
        name: 'Status meetings',
        tasks: [
          { id: 'sm1', name: 'Demo #1', color: '#9FC5F8', startDate: new Date(y, m, 5, 15, 0, 0), endDate: new Date(y, m, 5, 18, 30, 0) },
          { id: 'sm2', name: 'Demo #2', color: '#9FC5F8', startDate: new Date(y, m, 12, 15, 0, 0), endDate: new Date(y, m, 12, 18, 0, 0) },
          { id: 'sm3', name: 'Demo #3', color: '#9FC5F8', startDate: new Date(y, m, 19, 15, 0, 0), endDate: new Date(y, m, 19, 18, 0, 0) },
          { id: 'sm4', name: 'Demo #4', color: '#9FC5F8', startDate: new Date(y, m, 26, 15, 0, 0), endDate: new Date(y, m, 26, 18, 0, 0) },
          { id: 'sm5', name: 'Demo #5', color: '#9FC5F8', startDate: new Date(y, m + 1, 3, 9, 0, 0), endDate: new Date(y, m + 1, 3, 10, 0, 0) }
        ]
      },
      {
        id: 'kickoff',
        name: 'Kickoff',
        tasks: [
          { id: 'ko1', name: 'Day 1', color: '#9FC5F8', startDate: new Date(y, m, 1, 9, 0, 0), endDate: new Date(y, m, 1, 17, 0, 0), progress: { percent: 100, color: '#3C8CF8' } },
          { id: 'ko2', name: 'Day 2', color: '#9FC5F8', startDate: new Date(y, m, 2, 9, 0, 0), endDate: new Date(y, m, 2, 17, 0, 0), progress: { percent: 100, color: '#3C8CF8' } },
          { id: 'ko3', name: 'Day 3', color: '#9FC5F8', startDate: new Date(y, m, 3, 8, 30, 0), endDate: new Date(y, m, 3, 12, 0, 0), progress: { percent: 100, color: '#3C8CF8' } }
        ]
      },
      {
        id: 'create-concept',
        name: 'Create concept',
        content: '✨ <b>Create concept (Row)</b>',
        tasks: [
          {
            priority: 10,
            id: 'cc1',
            name: 'Create concept',
            color: '#F1C232',
            startDate: new Date(y, m, 4, 8, 0, 0),
            endDate: new Date(y, m, 10, 18, 0, 0),
            progress: 100,
            content: '⚙️ Create concept',
            sections: [
              { name: 'Section #1', startDate: new Date(y, m, 4, 8, 0, 0), endDate: new Date(y, m, 6, 12, 0, 0), color: '#3b82f6' },
              { name: 'Section #2', startDate: new Date(y, m, 6, 12, 0, 0), endDate: new Date(y, m, 8, 18, 0, 0), color: '#10b981' },
              { name: 'Section #3', startDate: new Date(y, m, 8, 18, 0, 0), endDate: new Date(y, m, 10, 18, 0, 0), color: '#f59e0b' }
            ],
            label: 'Draft Concept v1',
            bounds: { est: new Date(y, m, 2, 8, 0, 0), lct: new Date(y, m, 12, 18, 0, 0) }
          }
        ]
      },
      {
        id: 'finalize-concept',
        name: 'Finalize concept',
        tasks: [
          {
            id: 'fc1',
            name: 'Finalize concept',
            color: '#F1C232',
            startDate: new Date(y, m, 11, 8, 0, 0),
            endDate: new Date(y, m, 12, 18, 0, 0),
            progress: 100,
            label: 'Approval Ready',
            bounds: { est: new Date(y, m, 10, 8, 0, 0), lct: new Date(y, m, 14, 18, 0, 0) }
          }
        ]
      },
      {
        id: 'development',
        name: 'Development',
        isGroup: true,
        tasks: []
      },
      {
        id: 'sprint-1',
        name: 'Sprint 1',
        parent: 'Development',
        tasks: [
          {
            id: 'sp1',
            name: 'Product list view',
            color: '#F1C232',
            startDate: new Date(y, m, 13, 8, 0, 0),
            endDate: new Date(y, m, 18, 15, 0, 0),
            progress: 50,
            label: 'v1.0-alpha',
            dependencies: [{ to: 'sp2' }]
          }
        ]
      },
      {
        id: 'sprint-2',
        name: 'Sprint 2',
        parent: 'Development',
        tasks: [
          {
            id: 'sp2',
            name: 'Order basket',
            color: '#F1C232',
            startDate: new Date(y, m, 19, 8, 0, 0),
            endDate: new Date(y, m, 24, 15, 0, 0),
            progress: 75,
            dependencies: [{ to: 'sp3' }]
          }
        ]
      },
      {
        id: 'sprint-3',
        name: 'Sprint 3',
        parent: 'Development',
        tasks: [
          {
            id: 'sp3',
            name: 'Checkout',
            color: '#F1C232',
            startDate: new Date(y, m, 25, 8, 0, 0),
            endDate: new Date(y, m, 30, 15, 0, 0),
            progress: 40,
            dependencies: [{ to: 'sp4' }]
          }
        ]
      },
      {
        id: 'sprint-4',
        name: 'Sprint 4',
        parent: 'Development',
        tasks: [
          {
            id: 'sp4',
            name: 'Login & Signup & Admin Views',
            color: '#F1C232',
            startDate: new Date(y, m + 1, 1, 8, 0, 0),
            endDate: new Date(y, m + 1, 6, 15, 0, 0),
            progress: 25,
            dependencies: [{ to: 'st1' }, { to: 'cfg1' }]
          }
        ]
      },
      {
        id: 'hosting',
        name: 'Hosting',
        tasks: []
      },
      {
        id: 'server',
        name: 'Server',
        parent: 'Hosting',
        tasks: []
      },
      {
        id: 'setup',
        name: 'Setup',
        parent: 'Server',
        tasks: [
          { id: 'st1', name: 'HW', color: '#F1C232', startDate: new Date(y, m + 1, 7, 8, 0, 0), endDate: new Date(y, m + 1, 8, 12, 0, 0) }
        ]
      },
      {
        id: 'config',
        name: 'Config',
        parent: 'Server',
        tasks: [
          { id: 'cfg1', name: 'SW / DNS / Backups', color: '#F1C232', startDate: new Date(y, m + 1, 8, 12, 0, 0), endDate: new Date(y, m + 1, 11, 18, 0, 0) }
        ]
      },
      {
        id: 'deployment',
        name: 'Deployment',
        parent: 'Hosting',
        tasks: [
          { id: 'dp1', name: 'Depl. & Final testing', color: '#F1C232', startDate: new Date(y, m + 1, 12, 8, 0, 0), endDate: new Date(y, m + 1, 14, 12, 0, 0) }
        ]
      },
      {
        id: 'workshop',
        name: 'Workshop',
        tasks: [
          { id: 'ws1', name: 'On-side education', color: '#F1C232', startDate: new Date(y, m + 1, 15, 9, 0, 0), endDate: new Date(y, m + 1, 17, 15, 0, 0) }
        ]
      },
      {
        id: 'content',
        name: 'Content',
        tasks: [
          { id: 'cnt1', name: 'Supervise content creation', color: '#F1C232', startDate: new Date(y, m + 1, 18, 9, 0, 0), endDate: new Date(y, m + 1, 22, 16, 0, 0) }
        ]
      },
      {
        id: 'documentation',
        name: 'Documentation',
        tasks: [
          { id: 'doc1', name: 'Technical/User documentation', color: '#F1C232', startDate: new Date(y, m + 1, 18, 8, 0, 0), endDate: new Date(y, m + 1, 21, 18, 0, 0) }
        ]
      }
    ];
  }

  getSampleTimespans(): GanttTimespan[] {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    return [
      {
        id: 'ts1',
        name: 'Sprint 1 Timespan',
        startDate: new Date(y, m, 13, 8, 0, 0),
        endDate: new Date(y, m, 18, 15, 0, 0)
      }
    ];
  }
}
