import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CityInput } from '../../../shared/components/city-input/city-input';
import { WeatherService } from '../../../core/services/weather.service';

@Component({
  selector: 'app-current-weather-section',
  imports: [JsonPipe, CityInput],
  templateUrl: './current-weather-section.html',
  styleUrl: './current-weather-section.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrentWeatherSection {
  private readonly _currentWeatherService = inject(WeatherService);

  protected readonly currentWeather$$ = this._currentWeatherService.currentWeather$$;


  protected updateCity(city: string): void {
    this._currentWeatherService.updateCityLocation(city);
  }

}
