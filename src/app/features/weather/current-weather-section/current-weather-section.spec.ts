import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentWeatherSection } from './current-weather-section';

describe('CurrentWeatherSection', () => {
  let component: CurrentWeatherSection;
  let fixture: ComponentFixture<CurrentWeatherSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentWeatherSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentWeatherSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
