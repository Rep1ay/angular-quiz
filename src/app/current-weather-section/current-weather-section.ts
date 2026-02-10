import { Component, inject } from '@angular/core';
import { WeatherService } from '../weather/weather.service';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-current-weather-section',
  imports: [JsonPipe],
  templateUrl: './current-weather-section.html',
  styleUrl: './current-weather-section.scss',
})
export class CurrentWeatherSection {
  public readonly currentWeather = inject(WeatherService);

  protected readonly currentWeather$$ = this.currentWeather.currentWeather$$;

}
