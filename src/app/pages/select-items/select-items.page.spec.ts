import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectItemsPage } from './select-items.page';

describe('SelectItemsPage', () => {
  let component: SelectItemsPage;
  let fixture: ComponentFixture<SelectItemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectItemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
