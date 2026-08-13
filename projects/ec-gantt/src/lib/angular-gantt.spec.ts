import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularGantt } from './angular-gantt';

describe('AngularGantt', () => {
  let component: AngularGantt;
  let fixture: ComponentFixture<AngularGantt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AngularGantt],
    }).compileComponents();

    fixture = TestBed.createComponent(AngularGantt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
