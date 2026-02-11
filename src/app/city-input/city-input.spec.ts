import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityInput } from './city-input';

describe('CityInput', () => {
  let component: CityInput;
  let fixture: ComponentFixture<CityInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CityInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
