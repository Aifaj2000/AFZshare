import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendItemPage } from './send-item.page';

describe('SendItemPage', () => {
  let component: SendItemPage;
  let fixture: ComponentFixture<SendItemPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SendItemPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
