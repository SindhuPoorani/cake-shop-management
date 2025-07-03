import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomCakeBuilderComponent } from './custom-cake-builder.component';

describe('CustomCakeBuilderComponent', () => {
  let component: CustomCakeBuilderComponent;
  let fixture: ComponentFixture<CustomCakeBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomCakeBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomCakeBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
